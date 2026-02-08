import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { invitations, organizations } from "db/schema";
import { eq, and, gt } from "drizzle-orm";

export const GET: APIRoute = async ({ params, request }) => {
    const url = new URL(request.url);
    const token = params.token; // From [token].ts if dynamic route, or query param. 
    // Wait, Astro API routes are filesystem based. 
    // This file is likely src/pages/api/invitations/verify.ts, so it expects ?token=XYZ

    const tokenParam = url.searchParams.get('token');

    if (!tokenParam) {
        return new Response(JSON.stringify({ error: "Token required" }), { status: 400 });
    }

    const invite = await db.query.invitations.findFirst({
        where: and(
            eq(invitations.token, tokenParam),
            eq(invitations.status, 'pending'),
            gt(invitations.expiresAt, new Date())
        ),
        with: {
            organization: true,
            inviter: {
                columns: {
                    name: true,
                    email: true
                }
            }
        }
    });

    if (!invite) {
        return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), { status: 404 });
    }

    return new Response(JSON.stringify({
        valid: true,
        email: invite.email,
        organization: invite.organization,
        inviter: invite.inviter,
        role: invite.role
    }), { status: 200 });
};
