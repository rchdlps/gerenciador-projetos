import type { APIRoute } from "astro";
import { serve } from "inngest/astro";
import { inngest } from "@/lib/inngest/client";
import { notificationFunctions } from "@/lib/inngest/functions/notify";

// Serve the Inngest API endpoint
const handler = serve({
    client: inngest,
    functions: notificationFunctions,
});

export const GET: APIRoute = handler.GET;
export const POST: APIRoute = handler.POST;
export const PUT: APIRoute = handler.PUT;
