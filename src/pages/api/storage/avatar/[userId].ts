import type { APIRoute } from "astro"
import { storage } from "@/lib/storage"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { generateInitialsAvatar } from "@/lib/avatar-generator"

/**
 * Public avatar proxy — streams the user's avatar image from S3.
 * Falls back to generating an initials avatar if no image exists.
 */
export const GET: APIRoute = async ({ params, url }) => {
    const userId = params.userId
    if (!userId) {
        return new Response("Not found", { status: 404 })
    }

    const key = url.searchParams.get("key")

    // Path 1: Explicit key provided — serve from S3
    if (key) {
        if (!key.startsWith(`avatars/${userId}/`)) {
            return new Response("Forbidden", { status: 403 })
        }

        try {
            const buffer = await storage.downloadFile(key)
            const contentType = key.endsWith('.webp') ? 'image/webp'
                : key.endsWith('.svg') ? 'image/svg+xml'
                : key.endsWith('.png') ? 'image/png'
                : key.endsWith('.jpg') || key.endsWith('.jpeg') ? 'image/jpeg'
                : 'image/png'

            return new Response(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": buffer.length.toString(),
                    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
                },
            })
        } catch {
            // S3 file missing — fall through to generate on-the-fly
        }
    }

    // Path 2: No key or S3 file missing — generate initials avatar on-the-fly
    const [user] = await db
        .select({ name: users.name, id: users.id })
        .from(users)
        .where(eq(users.id, userId))

    if (!user) {
        return new Response("Not found", { status: 404 })
    }

    const svg = generateInitialsAvatar(user.name, user.id)
    const svgBuffer = Buffer.from(svg, "utf-8")

    // Upload to S3 and update users.image in the background (fire-and-forget)
    const s3Key = `avatars/${user.id}/initials.svg`
    const proxyUrl = `/api/storage/avatar/${user.id}?key=${encodeURIComponent(s3Key)}`
    storage.uploadFile(s3Key, svgBuffer, "image/svg+xml")
        .then(() => db.update(users).set({ image: proxyUrl }).where(eq(users.id, user.id)))
        .then(() => console.log(`[Avatar] Generated fallback initials avatar for user ${user.id}`))
        .catch(err => console.error(`[Avatar] Failed to persist fallback avatar for ${user.id}:`, err))

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Content-Length": svgBuffer.length.toString(),
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
    })
}
