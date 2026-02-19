import type { APIRoute } from "astro";
import { serve } from "inngest/astro";
import { inngest } from "@/lib/inngest/client";
import { notificationFunctions } from "@/lib/inngest/functions/notify";
import { adminNotificationFunctions } from "@/lib/inngest/functions/admin-notify";
import { imageFunctions } from "@/lib/inngest/functions/process-image";

// Serve the Inngest API endpoint.
// INNGEST_SERVE_HOST must be set to the public app URL in production (e.g. https://your-app.vercel.app)
// so Inngest cloud can call back into this endpoint to execute cron functions.
const handler = serve({
    client: inngest,
    functions: [...notificationFunctions, ...adminNotificationFunctions, ...imageFunctions],
    serveHost: process.env.INNGEST_SERVE_HOST || process.env.PUBLIC_URL,
});

export const GET: APIRoute = handler.GET;
export const POST: APIRoute = handler.POST;
export const PUT: APIRoute = handler.PUT;
