import 'dotenv/config';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { nanoid } from 'nanoid';
import { users, projects, stakeholders, boardColumns, boardCards, knowledgeAreas, organizations, memberships, auditLogs, accounts, sessions, projectPhases, tasks, appointments, attachments } from './schema';
import * as schema from './schema';
import { auth } from '../src/lib/auth';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in .env');
}

const client = new Pool({ connectionString });
const db = drizzle(client, { schema });

async function seed() {
    console.log('🌱 Seeding database with Multiple Personas...');

    try {
        // 1. Clean up Data
        console.log('🧹 Cleaning up old data...');
        await db.delete(auditLogs);
        await db.delete(attachments);
        await db.delete(knowledgeAreas);
        await db.delete(appointments);
        await db.delete(tasks);
        await db.delete(projectPhases);
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
            {
                id: smpoId,
                name: "Secretaria de Planejamento Estratégico",
                code: "SMPO",
                logoUrl: "/logos/smpo.png",
                secretario: "Dr. João Silva",
                secretariaAdjunta: "Maria Oliveira",
                diretoriaTecnica: "Eng. Carlos Santos"
            },
            {
                id: demoId,
                name: "Ambiente de Demonstração",
                code: "DEMO",
                logoUrl: "/logos/demo.png",
                secretario: "Admin Demo",
                secretariaAdjunta: "Assistente Demo",
                diretoriaTecnica: "Técnico Demo"
            },
            {
                id: smsId,
                name: "Secretaria Municipal de Saúde",
                code: "SMS",
                logoUrl: "/logos/sms.png",
                secretario: "Dra. Ana Costa",
                secretariaAdjunta: "Enf. Beatriz Lima",
                diretoriaTecnica: "Dr. Pedro Alves"
            },
            {
                id: smeId,
                name: "Secretaria Municipal de Educação",
                code: "SME",
                logoUrl: "/logos/sme.png",
                secretario: "Prof. Ricardo Nunes",
                secretariaAdjunta: "Profa. Julia Souza",
                diretoriaTecnica: "Pedagoga Fernanda Torres"
            },
            {
                id: smobId,
                name: "Secretaria de Obras Públicas",
                code: "SMOB",
                logoUrl: "/logos/smob.png",
                secretario: "Eng. Roberto Dias",
                secretariaAdjunta: "Arq. Camila Rocha",
                diretoriaTecnica: "Eng. Lucas Mendes"
            }
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

                // Audit log for membership creation
                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: userId, // Use the created user as creator for now
                    organizationId: m.orgId,
                    action: p.globalRole === 'super_admin' ? 'CREATE' : 'UPDATE',
                    resource: p.globalRole === 'super_admin' ? 'user' : 'membership',
                    resourceId: userId,
                    metadata: JSON.stringify({ email: p.email, name: p.name, orgRole: m.role }),
                    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
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

            // Audit Logs - Organization creation (simulate admin creating orgs)
            await db.insert(auditLogs).values({
                id: nanoid(),
                userId: adminUser.id,
                organizationId: p.orgId,
                action: 'CREATE',
                resource: 'organization',
                resourceId: p.orgId,
                metadata: JSON.stringify({ name: p.name, source: 'seed', action: 'initial_setup' }),
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
            });

            // Audit Log - Project creation
            await db.insert(auditLogs).values({
                id: nanoid(),
                userId: p.userId,
                organizationId: p.orgId,
                action: 'CREATE',
                resource: 'project',
                resourceId: projectId,
                metadata: JSON.stringify({ name: p.name, description: p.description }),
                createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
            });

            // Stakeholders
            const demoStakeholders = [
                { name: "Dr. João Silva", role: "Secretário", level: "patrocinador" },
                { name: "Maria Oliveira", role: "Gerente de Projeto", level: "gerente" },
                { name: "Carlos Santos", role: "Analista Financeiro", level: "equipe" },
                { name: "Ana Costa", role: "Representante da Comunidade", level: "interessado" }
            ];

            const createdStakeholderIds: string[] = [];

            for (const st of demoStakeholders) {
                const stId = nanoid();
                createdStakeholderIds.push(stId);
                await db.insert(stakeholders).values({
                    id: stId,
                    projectId,
                    name: st.name,
                    role: st.role,
                    level: st.level,
                    email: `${st.name.toLowerCase().replace(/ /g, '.')}@example.com`
                });

                // Audit log for stakeholder creation
                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'stakeholder',
                    resourceId: stId,
                    metadata: JSON.stringify({ name: st.name, role: st.role, level: st.level, projectId }),
                    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
                });
            }

            // Phases & Tasks
            const phasesList = [
                {
                    name: "Iniciação",
                    tasks: [
                        { title: "Project Charter", description: "Elaborar termo de abertura.", priority: "high", status: "done", dayOffset: -2 },
                        { title: "Identificação de Stakeholders", description: "Mapear interessados.", priority: "high", status: "done", dayOffset: -1 }
                    ]
                },
                {
                    name: "Planejamento",
                    tasks: [
                        { title: "Definição de Escopo", description: "Alinhar expectativas e entregáveis.", priority: "high", status: "done", dayOffset: 0 },
                        { title: "Cronograma Preliminar", description: "Estimativa de prazos.", priority: "high", status: "done", dayOffset: 0 },
                        { title: "Levantamento de Requisitos", description: "Entrevistas com stakeholders.", priority: "medium", status: "in_progress", dayOffset: 1 },
                        { title: "Matriz de Riscos", description: "Análise qualitativa.", priority: "medium", status: "todo", dayOffset: 1 }
                    ]
                },
                {
                    name: "Execução",
                    tasks: [
                        { title: "Desenvolvimento do MVP", description: "Implementar funcionalidades core.", priority: "high", status: "todo", dayOffset: 2 },
                        { title: "Design Sprint", description: "Validação de UX.", priority: "medium", status: "todo", dayOffset: 3 },
                        { title: "Revisão de Código", description: "Garantir qualidade.", priority: "medium", status: "todo", dayOffset: 4 },
                        { title: "Testes Unitários", description: "Garantir cobertura de código.", priority: "medium", status: "todo", dayOffset: 5 }
                    ]
                },
                {
                    name: "Monitoramento e Controle",
                    tasks: [
                        { title: "Reunião de Status", description: "Acompanhamento semanal.", priority: "medium", status: "todo", dayOffset: 6 },
                        { title: "Relatório de Progresso", description: "Atualizar KPI's.", priority: "low", status: "todo", dayOffset: 7 },
                        { title: "Gestão de Mudanças", description: "Avaliar solicitações.", priority: "medium", status: "todo", dayOffset: 8 }
                    ]
                },
                {
                    name: "Encerramento",
                    tasks: [
                        { title: "Homologação Final", description: "Aceite do cliente.", priority: "high", status: "todo", dayOffset: 9 },
                        { title: "Treinamento Final", description: "Capacitar usuários finais.", priority: "low", status: "todo", dayOffset: 10 },
                        { title: "Desmobilização", description: "Liberar recursos.", priority: "low", status: "todo", dayOffset: 11 },
                        { title: "Lições Aprendidas", description: "Documentar aprendizados.", priority: "low", status: "todo", dayOffset: 12 }
                    ]
                }
            ];

            let phaseOrder = 0;
            for (const phase of phasesList) {
                const phaseId = nanoid();
                await db.insert(projectPhases).values({
                    id: phaseId,
                    projectId,
                    name: phase.name,
                    order: phaseOrder++
                });

                // Audit log for phase creation
                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'phase',
                    resourceId: phaseId,
                    metadata: JSON.stringify({ name: phase.name, projectId }),
                    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
                });

                let taskOrder = 0;
                for (const task of phase.tasks) {
                    const taskDate = new Date();
                    taskDate.setDate(taskDate.getDate() + task.dayOffset);

                    // Assign a random stakeholder
                    const randomStakeholderId = createdStakeholderIds[Math.floor(Math.random() * createdStakeholderIds.length)];
                    const taskId = nanoid();

                    await db.insert(tasks).values({
                        id: taskId,
                        phaseId,
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        status: task.status,
                        assigneeId: p.userId,
                        stakeholderId: randomStakeholderId,
                        order: taskOrder++,
                        startDate: taskDate,
                        endDate: taskDate
                    });

                    // Audit log for task creation
                    await db.insert(auditLogs).values({
                        id: nanoid(),
                        userId: p.userId,
                        organizationId: p.orgId,
                        action: 'CREATE',
                        resource: 'task',
                        resourceId: taskId,
                        metadata: JSON.stringify({ title: task.title, status: task.status, projectId }),
                        createdAt: new Date(Date.now() - (13 - phaseOrder) * 24 * 60 * 60 * 1000) // Varied timestamps
                    });

                    // Add some UPDATE audit logs for tasks that are done or in_progress
                    if (task.status === 'done' || task.status === 'in_progress') {
                        await db.insert(auditLogs).values({
                            id: nanoid(),
                            userId: p.userId,
                            organizationId: p.orgId,
                            action: 'UPDATE',
                            resource: 'task',
                            resourceId: taskId,
                            metadata: JSON.stringify({
                                title: task.title,
                                status: task.status,
                                changes: ['status'],
                                previousStatus: 'todo'
                            }),
                            createdAt: new Date(Date.now() - (10 - phaseOrder) * 24 * 60 * 60 * 1000)
                        });
                    }
                }
            }

            // Appointments
            const appointmentEvents = [
                { desc: "Reunião de Kick-off", dayOffset: 0 },
                { desc: "Apresentação de Status", dayOffset: 5 },
                { desc: "Workshop com Stakeholders", dayOffset: 10 }
            ];

            for (const apt of appointmentEvents) {
                const aptDate = new Date();
                aptDate.setDate(aptDate.getDate() + apt.dayOffset);

                await db.insert(appointments).values({
                    id: nanoid(),
                    projectId,
                    description: apt.desc,
                    date: aptDate
                });
            }
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
