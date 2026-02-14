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

export async function sendMemberAddedEmail(to: string, organizationName: string, role: string, loginLink: string) {
    const roleLabels: Record<string, string> = {
        viewer: 'Visualizador',
        gestor: 'Editor',
        secretario: 'Administrador'
    };

    const roleLabel = roleLabels[role] || role;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Você foi adicionado a uma organização!</h2>
            <p>Você foi adicionado à organização <strong>${organizationName}</strong> como <strong>${roleLabel}</strong>.</p>
            <p>Clique no botão abaixo para acessar o sistema:</p>
            <a href="${loginLink}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                Acessar Sistema
            </a>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p>${loginLink}</p>
        </div>
    `;

    return sendEmail({
        to,
        subject: `Você foi adicionado à ${organizationName}`,
        html,
    });
}

export async function sendMemberInviteEmail(to: string, organizationName: string, role: string, inviteLink: string) {
    const roleLabels: Record<string, string> = {
        viewer: 'Visualizador',
        gestor: 'Editor',
        secretario: 'Administrador'
    };

    const roleLabel = roleLabels[role] || role;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Você foi convidado!</h2>
            <p>Você foi convidado para participar da organização <strong>${organizationName}</strong> como <strong>${roleLabel}</strong>.</p>
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
        subject: `Convite para ${organizationName}`,
        html,
    });
}

export async function sendVerificationEmail(to: string, verificationLink: string) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verifique seu Email</h2>
            <p>Obrigado por se registrar! Por favor, verifique seu endereço de email para continuar.</p>
            <p>Clique no botão abaixo para verificar seu email:</p>
            <a href="${verificationLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                Verificar Email
            </a>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p>${verificationLink}</p>
        </div>
    `;

    return sendEmail({
        to,
        subject: 'Verifique seu Email',
        html,
    });
}

type DigestNotification = {
    title: string;
    message: string;
    createdAt: Date;
};

export async function sendDailyDigestEmail(to: string, userName: string, notifications: DigestNotification[]) {
    const notificationItems = notifications.map(n => {
        const time = new Date(n.createdAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <strong>${n.title}</strong>
                    <p style="margin: 4px 0 0 0; color: #6b7280;">${n.message}</p>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; white-space: nowrap;">
                    ${time}
                </td>
            </tr>
        `;
    }).join('');

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>📬 Resumo Diário de Notificações</h2>
            <p>Olá ${userName},</p>
            <p>Aqui está o resumo das suas notificações das últimas 24 horas:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background-color: #f9fafb;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Notificação</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Hora</th>
                    </tr>
                </thead>
                <tbody>
                    ${notificationItems}
                </tbody>
            </table>
            
            <p>Total: <strong>${notifications.length}</strong> notificações</p>
            
            <a href="${process.env.PUBLIC_URL || 'http://localhost:4321'}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                Ver no Sistema
            </a>
        </div>
    `;

    return sendEmail({
        to,
        subject: `📬 Resumo Diário - ${notifications.length} notificações`,
        html,
    });
}

