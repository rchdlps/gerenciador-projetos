
import type { APIRoute } from "astro"
import { storage } from "@/lib/storage"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "../../../../db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { inngest } from "@/lib/inngest/client"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB for avatars

export const POST: APIRoute = async ({ request }) => {
    try {
        const authHeaders = new Headers()
        const cookie = request.headers.get("cookie")
        if (cookie) authHeaders.set("cookie", cookie)
        const session = await auth.api.getSession({ headers: authHeaders })
        if (!session) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: "Missing file" }), { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` }),
                { status: 400 }
            )
        }

        const key = `avatars/${session.user.id}/${nanoid()}-${file.name}`
        const buffer = Buffer.from(await file.arrayBuffer())

        await storage.uploadFile(key, buffer, file.type)

        const publicUrl = storage.getPublicUrl(key)

        await db.update(users).set({ image: publicUrl }).where(eq(users.id, session.user.id))

        // Trigger background processing to optimize the avatar
        if (file.type.startsWith('image/')) {
            inngest.send({
                name: "image/process",
                data: { key, userId: session.user.id, type: "avatar" },
            }).catch(err => console.error("[Storage] Failed to emit image/process event:", err))
        }

        return new Response(JSON.stringify({ publicUrl }), { status: 200 })
    } catch (error) {
        console.error("[Storage] Avatar upload failed:", error)
        return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500 })
    }
}
