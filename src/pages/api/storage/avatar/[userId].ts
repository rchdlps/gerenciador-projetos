import type { APIRoute } from "astro"
import { storage } from "@/lib/storage"

/**
 * Public avatar proxy — streams the user's avatar image from S3.
 * No auth required so avatars render everywhere (nav bars, member lists, etc.).
 * The S3 key is passed as a `key` query parameter.
 * Example: /api/storage/avatar/userId?key=avatars/userId/nanoid-file.webp
 */
export const GET: APIRoute = async ({ params, url }) => {
    const userId = params.userId
    const key = url.searchParams.get("key")

    if (!userId || !key) {
        return new Response("Not found", { status: 404 })
    }

    // Security: only allow serving files from this user's avatar prefix
    if (!key.startsWith(`avatars/${userId}/`)) {
        return new Response("Forbidden", { status: 403 })
    }

    try {
        const buffer = await storage.downloadFile(key)

        const contentType = key.endsWith('.webp') ? 'image/webp'
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
        return new Response("Not found", { status: 404 })
    }
}
