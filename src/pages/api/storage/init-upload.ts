
import type { APIRoute } from "astro";

export const POST: APIRoute = async () => {
    console.warn("[Storage] DEPRECATED: POST /api/storage/init-upload — use POST /api/storage/upload-avatar instead")
    return new Response(
        JSON.stringify({ error: "This endpoint is deprecated. Use POST /api/storage/upload-avatar with multipart/form-data instead." }),
        { status: 410 }
    )
}
