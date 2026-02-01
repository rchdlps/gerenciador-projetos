import { auth } from "@/lib/auth"; // path to your auth file
import type { APIRoute } from "astro";
export const ALL: APIRoute = async (ctx) => {
    return auth.handler(ctx.request);
};
