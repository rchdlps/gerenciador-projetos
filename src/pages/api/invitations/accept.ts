import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { invitations, memberships, organizations } from "db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
    // Use verify to not require session yet? Or assume user just signed up and has session?
    // Since they just signed up in the client-side code before calling this, they should have a session.
    // Only pass cookie header — passing Origin triggers better-auth's CSRF check
    const authHeaders = new Headers();
    const cookie = request.headers.get('cookie');
    if (cookie) authHeaders.set('cookie', cookie);
    const session = await auth.api.getSession({ headers: authHeaders });

    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: "Unauthorized - User must be created first" }), { status: 401 });
    }

    const { token, inviteId } = await request.json();

    const invite = await db.query.invitations.findFirst({
        where: and(
            eq(invitations.id, inviteId),
            eq(invitations.token, token),
            eq(invitations.status, 'pending')
        )
    });

    if (!invite) {
        return new Response(JSON.stringify({ error: "Invalid invitation" }), { status: 400 });
    }

    // Verify email matches
    if (invite.email !== session.user.email) {
        return new Response(JSON.stringify({ error: "Email mismatch" }), { status: 403 });
    }

    // Add to organization
    if (invite.organizationId) {
        // Check if already member
        const existingMember = await db.query.memberships.findFirst({
            where: and(
                eq(memberships.userId, session.user.id),
                eq(memberships.organizationId, invite.organizationId)
            )
        })

        if (!existingMember) {
            await db.insert(memberships).values({
                userId: session.user.id,
                organizationId: invite.organizationId,
                role: invite.role as any || 'viewer'
            });
        }
    }

    // Update invite status
    await db.update(invitations)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(invitations.id, inviteId));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
};
