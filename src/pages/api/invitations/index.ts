import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { invitations, organizations, users } from "db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendInvitationEmail } from "@/lib/email/client";
import { auth } from "@/lib/auth";

export const POST: APIRoute = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { email, role, organizationId } = await request.json();

    if (!email || !organizationId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Check if user is admin/owner of org (implementation depends on your permission model)
    // For now, allow logged in users to invite to their orgs

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (existingUser) {
        return new Response(JSON.stringify({ error: "User already exists" }), { status: 409 });
    }

    // Check if pending invite exists
    const existingInvite = await db.query.invitations.findFirst({
        where: and(
            eq(invitations.email, email),
            eq(invitations.organizationId, organizationId),
            eq(invitations.status, 'pending')
        )
    });

    if (existingInvite) {
        return new Response(JSON.stringify({ error: "Invitation already pending" }), { status: 409 });
    }

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(invitations).values({
        id: nanoid(),
        email,
        role: role || 'user',
        organizationId,
        token,
        expiresAt,
        inviterId: session.user.id,
        status: 'pending'
    });

    // Send Email
    const inviteLink = `${new URL(request.url).origin}/accept-invite/${token}`;
    await sendInvitationEmail(email, inviteLink);

    return new Response(JSON.stringify({ success: true }), { status: 201 });
};
