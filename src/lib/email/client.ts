import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || (import.meta.env as any).RESEND_API_KEY;
// If no API key is provided, we'll log emails to console (dev mode)
const isDev = !resendApiKey;

export const resend = isDev ? null : new Resend(resendApiKey);

type EmailOptions = {
    to: string;
    subject: string;
    html: string;
    from?: string;
};

const DEFAULT_FROM = "Gerenciador de Projetos <no-reply@infex.com.br>";

export async function sendEmail({ to, subject, html, from = DEFAULT_FROM }: EmailOptions) {
    if (isDev || !resend) {
        console.log('--- MOCK EMAIL SENT ---');
        console.log(`To: ${to}`);
        console.log(`From: ${from}`);
        console.log(`Subject: ${subject}`);
        console.log('--- Body ---');
        console.log(html);
        console.log('-----------------------');
        return { success: true, id: 'mock-id' };
    }

    try {
        const data = await resend.emails.send({
            from,
            to,
            subject,
            html,
        });

        return { success: true, data };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
}

export async function sendInvitationEmail(to: string, inviteLink: string) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Você foi convidado!</h2>
            <p>Você foi convidado para participar do Gerenciador de Projetos.</p>
            <p>Clique no botão abaixo para aceitar o convite e configurar sua conta:</p>
            <a href="${inviteLink}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                Aceitar Convite
            </a>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p>${inviteLink}</p>
        </div>
    `;

    return sendEmail({
        to,
        subject: 'Convite para Gerenciador de Projetos',
        html,
    });
}

export async function sendRecoveryEmail(to: string, resetLink: string) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Recuperação de Senha</h2>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                Redefinir Senha
            </a>
            <p>Se você não solicitou isso, pode ignorar este email.</p>
        </div>
    `;

    return sendEmail({
        to,
        subject: 'Redefinição de Senha',
        html,
    });
}
