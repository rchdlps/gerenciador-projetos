import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { nanoid } from 'nanoid';
import { users, projects, stakeholders, boardColumns, boardCards, knowledgeAreas, organizations, memberships, auditLogs, accounts, sessions } from './schema';
import * as schema from './schema';
import { auth } from '../src/lib/auth';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in .env');
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
    console.log('🌱 Seeding database with Multiple Personas...');

    try {
        // 1. Clean up Data
        console.log('🧹 Cleaning up old data...');
        await db.delete(auditLogs);
        await db.delete(knowledgeAreas);
        await db.delete(boardCards);
        await db.delete(boardColumns);
        await db.delete(stakeholders);
        await db.delete(projects);
        await db.delete(memberships);
        await db.delete(organizations);
        await db.delete(accounts); // Fix FK
        await db.delete(sessions); // Fix FK
        await db.delete(users);

        // 2. Create Organizations
        const smpoId = nanoid();
        const demoId = nanoid();
        const smsId = nanoid();
        const smeId = nanoid();
        const smobId = nanoid();

        console.log('🏛️  Creating Secretarias...');
        await db.insert(organizations).values([
            { id: smpoId, name: "Secretaria de Planejamento Estratégico", code: "SMPO", logoUrl: "/logos/smpo.png" },
            { id: demoId, name: "Ambiente de Demonstração", code: "DEMO", logoUrl: "/logos/demo.png" },
            { id: smsId, name: "Secretaria Municipal de Saúde", code: "SMS", logoUrl: "/logos/sms.png" },
            { id: smeId, name: "Secretaria Municipal de Educação", code: "SME", logoUrl: "/logos/sme.png" },
            { id: smobId, name: "Secretaria de Obras Públicas", code: "SMOB", logoUrl: "/logos/smob.png" }
        ]);

        // 3. Create Users & Memberships
        const personas = [
            {
                name: "Admin Geral",
                email: "admin@cuiaba.mt.gov.br",
                globalRole: "super_admin" as const,
                memberships: [
                    { orgId: smpoId, role: "secretario" },
                    { orgId: demoId, role: "gestor" }
                ]
            },
            {
                name: "Gestor Saúde",
                email: "saude@cuiaba.mt.gov.br",
                globalRole: "user" as const,
                memberships: [
                    { orgId: smsId, role: "secretario" }
                ]
            },
            {
                name: "Gestor Obras",
                email: "obras@cuiaba.mt.gov.br",
                globalRole: "user" as const,
                memberships: [
                    { orgId: smobId, role: "secretario" }
                ]
            },
            {
                name: "Fiscal Educação",
                email: "educacao@cuiaba.mt.gov.br",
                globalRole: "user" as const,
                memberships: [
                    { orgId: smeId, role: "viewer" }
                ]
            }
        ];

        for (const p of personas) {
            // Use better-auth to create user + account + password
            // We mock the request if needed, but signUpEmail usually works directly on server instance
            const res = await auth.api.signUpEmail({
                body: {
                    email: p.email,
                    password: "password123",
                    name: p.name
                }
            });

            if (!res?.user) {
                console.error(`Failed to create user ${p.email}`);
                continue;
            }

            const userId = res.user.id;

            // Update global role if super_admin
            if (p.globalRole === 'super_admin') {
                await db.update(users).set({ globalRole: 'super_admin' }).where(eq(users.id, userId));
            }

            for (const m of p.memberships) {
                await db.insert(memberships).values({
                    userId,
                    organizationId: m.orgId,
                    role: m.role as any
                });
            }
            console.log(`👤 Created ${p.name} (${p.email}) with password 'password123'`);
        }

        // Need ID of Admin for creators field later if needed, but we can reuse query if complex. 
        // For simplicity, let's just create projects assigned to the FIRST user (Super Admin) or specific if we tracked IDs.
        // Let's re-fetch the admin user ID.
        const [adminUser] = await db.select().from(users).where(eq(users.email, "admin@cuiaba.mt.gov.br"));
        const [saudeUser] = await db.select().from(users).where(eq(users.email, "saude@cuiaba.mt.gov.br"));
        const [obrasUser] = await db.select().from(users).where(eq(users.email, "obras@cuiaba.mt.gov.br"));

        // 4. Seed Projects
        const projectsData = [
            // DEMO (Admin)
            {
                name: "Implantação do Sistema ERP",
                description: "Migração e implantação do novo sistema integrado de gestão.",
                orgId: demoId,
                userId: adminUser.id,
                status: ["Planejamento", "Execução", "Homologação"],
                cards: ["Mapeamento de Processos", "Treinamento de Key Users", "Migração de Dados Legados"]
            },
            // SMPO (Admin)
            {
                name: "Revisão do Plano Diretor 2030",
                description: "Atualização das diretrizes de expansão urbana e saneamento.",
                orgId: smpoId,
                userId: adminUser.id,
                status: ["Audiências Públicas", "Redação", "Aprovação"],
                cards: ["Convocação de Audiência Sul", "Estudo de Impacto Ambiental"]
            },
            // SMS (Saude User)
            {
                name: "Campanha de Vacinação 2026",
                description: "Logística e distribuição de vacinas contra Gripe e Dengue.",
                orgId: smsId,
                userId: saudeUser.id,
                status: ["Logística", "Comunicação", "Execução"],
                cards: ["Aquisição de Seringas", "Campanha TV/Rádio"]
            },
            // SMOB (Obras User)
            {
                name: "Asfalto Novo - Bairro Jardim Europa",
                description: "Pavimentação de 15km de vias urbanas.",
                orgId: smobId,
                userId: obrasUser.id, // Fixed: use Obras user
                status: ["Projetos", "Terraplanagem", "Asfaltamento"],
                cards: ["Topografia", "Drenagem Pluvial", "Sinalização Viária"]
            }
        ];

        console.log(`📂 Creating ${projectsData.length} projects...`);

        for (const p of projectsData) {
            const projectId = nanoid();
            await db.insert(projects).values({
                id: projectId,
                name: p.name,
                description: p.description,
                userId: p.userId,
                organizationId: p.orgId,
            });

            // Board - Create Columns
            const colIds: string[] = [];
            let order = 0;
            const statusList = p.status || ["A Fazer", "Em Andamento", "Concluído"];

            for (const statusName of statusList) {
                const colId = nanoid();
                colIds.push(colId);
                await db.insert(boardColumns).values({
                    id: colId,
                    projectId,
                    name: statusName,
                    order: order++,
                    color: statusName === "Concluído" || statusName === "Done" ? "green" : undefined
                });
            }

            // Cards
            if (p.cards) {
                for (const cardContent of p.cards) {
                    await db.insert(boardCards).values({
                        id: nanoid(),
                        columnId: colIds[0], // Add to first column
                        content: cardContent,
                        priority: Math.random() > 0.5 ? "high" : "medium",
                        order: 0
                    });
                }
            }

            // Audit Log
            await db.insert(auditLogs).values({
                id: nanoid(),
                userId: p.userId,
                organizationId: p.orgId,
                action: 'CREATE',
                resource: 'PROJECT',
                resourceId: projectId,
                metadata: JSON.stringify({ name: p.name, source: 'seed' })
            });
        }

        console.log('✅ Seeding complete!');

    } catch (e) {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seed();
