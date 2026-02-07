import 'dotenv/config';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, sql } from 'drizzle-orm';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { nanoid } from 'nanoid';
import {
    users, projects, stakeholders, boardColumns, boardCards, knowledgeAreas,
    organizations, memberships, auditLogs, accounts, sessions, projectPhases,
    tasks, appointments, attachments, knowledgeAreaChanges, projectCharters,
    projectMilestones, projectDependencies, projectQualityMetrics,
    projectQualityChecklists, projectCommunicationPlans, projectMeetings,
    procurementSuppliers, procurementContracts
} from './schema';
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
    console.log('🌱 Seeding database with Comprehensive Data...');

    try {
        // 1. Clean up Data (in correct order for foreign keys)
        console.log('🧹 Cleaning up old data...');
        await db.delete(auditLogs);
        await db.delete(attachments);
        await db.delete(knowledgeAreaChanges);
        await db.delete(knowledgeAreas);
        await db.delete(projectCommunicationPlans);
        await db.delete(projectMeetings);
        await db.delete(procurementContracts);
        await db.delete(procurementSuppliers);
        await db.delete(projectQualityMetrics);
        await db.delete(projectQualityChecklists);
        await db.delete(projectMilestones);
        await db.delete(projectDependencies);
        await db.delete(projectCharters);
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
        const [educacaoUser] = await db.select().from(users).where(eq(users.email, "educacao@cuiaba.mt.gov.br"));

        // 4. Seed Projects (3 per organization = 15 projects total)
        const projectsData = [
            // =============== DEMO - Ambiente de Demonstração (3) ===============
            {
                name: "Implantação do Sistema ERP",
                description: "Migração e implantação do novo sistema integrado de gestão administrativa e financeira.",
                orgId: demoId,
                userId: adminUser.id,
                type: "TIC",
                projectStatus: "em_andamento",
                status: ["Planejamento", "Execução", "Homologação"],
                cards: ["Mapeamento de Processos", "Treinamento de Key Users", "Migração de Dados Legados"]
            },
            {
                name: "Portal de Transparência 2.0",
                description: "Redesign completo do portal de transparência com novas funcionalidades de busca e visualização.",
                orgId: demoId,
                userId: adminUser.id,
                type: "TIC",
                projectStatus: "concluido", // COMPLETED PROJECT
                status: ["Design", "Desenvolvimento", "Deploy"],
                cards: ["Wireframes", "API de Dados Abertos", "Dashboard Interativo"]
            },
            {
                name: "App Cidadão Mobile",
                description: "Aplicativo móvel para serviços municipais, agendamentos e acompanhamento de protocolos.",
                orgId: demoId,
                userId: adminUser.id,
                type: "TIC",
                projectStatus: "em_andamento",
                status: ["Pesquisa", "Prototipação", "Lançamento"],
                cards: ["Design System", "Integração SSO", "Push Notifications"]
            },

            // =============== SMPO - Secretaria de Planejamento Estratégico (3) ===============
            {
                name: "Revisão do Plano Diretor 2030",
                description: "Atualização das diretrizes de expansão urbana, zoneamento e saneamento para os próximos 10 anos.",
                orgId: smpoId,
                userId: adminUser.id,
                type: "Legislativo",
                projectStatus: "em_andamento",
                status: ["Audiências Públicas", "Redação", "Aprovação"],
                cards: ["Convocação de Audiência Sul", "Estudo de Impacto Ambiental", "Mapa Interativo"]
            },
            {
                name: "Plano Plurianual 2026-2029",
                description: "Elaboração do PPA com metas, indicadores e orçamento para o quadriênio.",
                orgId: smpoId,
                userId: adminUser.id,
                type: "Legislativo",
                projectStatus: "planejamento",
                status: ["Diagnóstico", "Metas", "Validação"],
                cards: ["Coleta de Dados", "Oficinas Setoriais", "Sistema de Monitoramento"]
            },
            {
                name: "Observatório de Indicadores Municipais",
                description: "Plataforma de acompanhamento de indicadores sociais, econômicos e ambientais do município.",
                orgId: smpoId,
                userId: adminUser.id,
                type: "TIC",
                projectStatus: "suspenso",
                status: ["Pesquisa", "Desenvolvimento", "Operação"],
                cards: ["Definição de KPIs", "ETL de Dados", "Dashboards Públicos"]
            },

            // =============== SMS - Secretaria Municipal de Saúde (3) ===============
            {
                name: "Campanha de Vacinação 2026",
                description: "Logística e distribuição de vacinas contra Gripe, Dengue e COVID-19 atualizada.",
                orgId: smsId,
                userId: saudeUser.id,
                type: "Serviço",
                projectStatus: "em_andamento",
                status: ["Logística", "Comunicação", "Execução"],
                cards: ["Aquisição de Seringas", "Campanha TV/Rádio", "Postos Itinerantes"]
            },
            {
                name: "Reforma da UPA Morada do Ouro",
                description: "Reforma e ampliação da Unidade de Pronto Atendimento com novos leitos e equipamentos.",
                orgId: smsId,
                userId: saudeUser.id,
                type: "Obra",
                projectStatus: "em_andamento",
                status: ["Projeto", "Licitação", "Execução"],
                cards: ["Projeto Arquitetônico", "Aquisição de Equipamentos", "Contratação de Profissionais"]
            },
            {
                name: "Sistema de Agendamento Online",
                description: "Implementação de sistema de agendamento de consultas e exames via web e aplicativo.",
                orgId: smsId,
                userId: saudeUser.id,
                type: "TIC",
                projectStatus: "concluido", // COMPLETED PROJECT
                status: ["Análise", "Desenvolvimento", "Implantação"],
                cards: ["Integração eSUS", "App Mobile", "Central de Atendimento"]
            },

            // =============== SME - Secretaria Municipal de Educação (3) ===============
            {
                name: "Programa Escola Digital",
                description: "Implantação de laboratórios de informática e tablets educacionais em 50 escolas municipais.",
                orgId: smeId,
                userId: educacaoUser?.id || adminUser.id,
                type: "TIC",
                projectStatus: "em_andamento",
                status: ["Planejamento", "Aquisição", "Instalação"],
                cards: ["Diagnóstico de Infraestrutura", "Licitação de Equipamentos", "Capacitação de Professores"]
            },
            {
                name: "Reforma de 15 Creches Municipais",
                description: "Adequação de espaços físicos, climatização e acessibilidade nas creches da rede municipal.",
                orgId: smeId,
                userId: educacaoUser?.id || adminUser.id,
                type: "Obra",
                projectStatus: "planejamento",
                status: ["Projetos", "Contratação", "Obras"],
                cards: ["Levantamento de Demandas", "Processo Licitatório", "Fiscalização de Obras"]
            },
            {
                name: "Formação Continuada 2026",
                description: "Programa de capacitação para 2.000 professores da rede municipal em metodologias ativas.",
                orgId: smeId,
                userId: educacaoUser?.id || adminUser.id,
                type: "Eventos",
                projectStatus: "em_andamento",
                status: ["Planejamento", "Execução", "Avaliação"],
                cards: ["Parcerias Universitárias", "Módulos EAD", "Certificação"]
            },

            // =============== SMOB - Secretaria de Obras Públicas (3) ===============
            {
                name: "Asfalto Novo - Bairro Jardim Europa",
                description: "Pavimentação de 15km de vias urbanas com drenagem pluvial e sinalização.",
                orgId: smobId,
                userId: obrasUser.id,
                type: "Obra",
                projectStatus: "em_andamento",
                status: ["Projetos", "Terraplanagem", "Asfaltamento"],
                cards: ["Topografia", "Drenagem Pluvial", "Sinalização Viária"]
            },
            {
                name: "Revitalização do Parque das Águas",
                description: "Modernização do parque com novos equipamentos, iluminação LED e paisagismo.",
                orgId: smobId,
                userId: obrasUser.id,
                type: "Obra",
                projectStatus: "concluido", // COMPLETED PROJECT
                status: ["Design", "Contratação", "Execução"],
                cards: ["Projeto Paisagístico", "Mobiliário Urbano", "Sistema de Irrigação"]
            },
            {
                name: "Ponte sobre o Rio Coxipó",
                description: "Construção de nova ponte ligando os bairros Jardim das Américas e Boa Esperança.",
                orgId: smobId,
                userId: obrasUser.id,
                type: "Obra",
                projectStatus: "em_andamento",
                status: ["Estudos", "Fundações", "Superestrutura"],
                cards: ["Estudo Hidrológico", "Projeto Estrutural", "Licenciamento Ambiental"]
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
                type: p.type, // Added
                status: p.projectStatus // Added
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
                metadata: JSON.stringify({ name: p.name, description: p.description, type: p.type, status: p.projectStatus }),
                createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
            });

            // ... (Stakeholders logic remains same) ...
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

                    // FORCE DONE status if project is completed
                    const forcedStatus = p.projectStatus === "concluido" ? "done" : task.status;

                    await db.insert(tasks).values({
                        id: taskId,
                        phaseId,
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        status: forcedStatus, // Use forced status
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

            // Appointments (expanded)
            const appointmentEvents = [
                { desc: "Reunião de Kick-off", dayOffset: 0 },
                { desc: "Apresentação de Status Semanal", dayOffset: 7 },
                { desc: "Revisão de Sprint", dayOffset: 14 },
                { desc: "Workshop com Stakeholders", dayOffset: 21 },
                { desc: "Reunião de Alinhamento Estratégico", dayOffset: 28 },
                { desc: "Comitê de Governança", dayOffset: 35 }
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

            // Knowledge Areas Content
            const knowledgeAreasData = [
                { area: "escopo", content: "## Escopo do Projeto\n\nEste projeto visa implementar melhorias significativas para a comunidade. O escopo inclui:\n\n- **Fase 1**: Levantamento de requisitos e planejamento\n- **Fase 2**: Desenvolvimento e implementação\n- **Fase 3**: Testes e validação\n- **Fase 4**: Entrega e suporte inicial\n\n### Exclusões\n- Manutenção contínua após 6 meses\n- Integrações com sistemas legados não documentados" },
                { area: "cronograma", content: "## Cronograma Geral\n\n| Fase | Início | Término | Status |\n|------|--------|---------|--------|\n| Iniciação | 01/01/2026 | 15/01/2026 | ✅ Concluído |\n| Planejamento | 16/01/2026 | 28/02/2026 | ⚙️ Em andamento |\n| Execução | 01/03/2026 | 30/06/2026 | ⏳ Pendente |\n| Encerramento | 01/07/2026 | 15/07/2026 | ⏳ Pendente |" },
                { area: "custos", content: "## Orçamento do Projeto\n\n### Resumo Financeiro\n- **Orçamento Total**: R$ 500.000,00\n- **Gasto Atual**: R$ 125.000,00 (25%)\n- **Reserva de Contingência**: R$ 50.000,00\n\n### Distribuição por Categoria\n| Categoria | Valor | % do Total |\n|-----------|-------|------------|\n| Recursos Humanos | R$ 300.000 | 60% |\n| Infraestrutura | R$ 100.000 | 20% |\n| Licenças/Software | R$ 50.000 | 10% |\n| Contingência | R$ 50.000 | 10% |" },
                { area: "comunicacao", content: "## Plano de Comunicação\n\n### Princípios\n1. Transparência nas informações\n2. Comunicação proativa\n3. Canais claros e definidos\n\n### Frequência de Relatórios\n- **Semanal**: Status de progresso para equipe\n- **Quinzenal**: Relatório para stakeholders\n- **Mensal**: Dashboard executivo para diretoria" },
                { area: "riscos", content: "## Gestão de Riscos\n\n### Top 5 Riscos Identificados\n\n1. **Atraso na entrega de equipamentos** - Probabilidade: Alta, Impacto: Alto\n   - Mitigação: Contratação de fornecedor alternativo\n\n2. **Rotatividade da equipe** - Probabilidade: Média, Impacto: Alto\n   - Mitigação: Plano de retenção e documentação detalhada\n\n3. **Mudança de requisitos** - Probabilidade: Alta, Impacto: Médio\n   - Mitigação: Processo formal de gestão de mudanças\n\n4. **Problemas técnicos na integração** - Probabilidade: Média, Impacto: Alto\n   - Mitigação: POC antecipada e equipe especializada\n\n5. **Orçamento insuficiente** - Probabilidade: Baixa, Impacto: Alto\n   - Mitigação: Reserva de contingência de 10%" },
                { area: "qualidade", content: "## Plano de Qualidade\n\n### Métricas de Qualidade\n- Cobertura de testes: mínimo 80%\n- Taxa de defeitos: máximo 2 bugs críticos por release\n- Satisfação do usuário: mínimo 8/10\n\n### Processos de Garantia\n1. Code review obrigatório\n2. Testes automatizados\n3. Homologação com usuários-chave\n4. Documentação atualizada" }
            ];

            for (const ka of knowledgeAreasData) {
                const kaId = nanoid();
                await db.insert(knowledgeAreas).values({
                    id: kaId,
                    projectId,
                    area: ka.area,
                    content: ka.content
                });

                // Audit log
                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'knowledge_area',
                    resourceId: kaId,
                    metadata: JSON.stringify({ area: ka.area, projectId }),
                    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
                });

                // Add change records for some areas
                if (ka.area === 'escopo' || ka.area === 'cronograma') {
                    const changeId = nanoid();
                    await db.insert(knowledgeAreaChanges).values({
                        id: changeId,
                        knowledgeAreaId: kaId,
                        description: ka.area === 'escopo'
                            ? 'Inclusão de nova funcionalidade de relatórios'
                            : 'Ajuste de prazo da Fase 2 em 2 semanas',
                        type: ka.area === 'escopo' ? 'Escopo' : 'Cronograma',
                        status: 'Aprovado',
                        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                    });

                    await db.insert(auditLogs).values({
                        id: nanoid(),
                        userId: p.userId,
                        organizationId: p.orgId,
                        action: 'CREATE',
                        resource: 'knowledge_area_change',
                        resourceId: changeId,
                        metadata: JSON.stringify({ area: ka.area, type: ka.area === 'escopo' ? 'Escopo' : 'Cronograma' }),
                        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                    });
                }
            }

            // Communication Plans
            const commPlans = [
                { info: "Status semanal do projeto", stakeholders: "Equipe técnica, Gerência", frequency: "Semanal", medium: "E-mail + Reunião" },
                { info: "Relatório de progresso executivo", stakeholders: "Diretoria, Patrocinador", frequency: "Quinzenal", medium: "Apresentação PPT" },
                { info: "Alertas de riscos críticos", stakeholders: "Todos os stakeholders", frequency: "Sob demanda", medium: "E-mail urgente + WhatsApp" },
                { info: "Newsletter do projeto", stakeholders: "Toda organização", frequency: "Mensal", medium: "Intranet + E-mail" }
            ];

            for (const cp of commPlans) {
                const cpId = nanoid();
                await db.insert(projectCommunicationPlans).values({
                    id: cpId,
                    projectId,
                    info: cp.info,
                    stakeholders: cp.stakeholders,
                    frequency: cp.frequency,
                    medium: cp.medium
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'communication_plan',
                    resourceId: cpId,
                    metadata: JSON.stringify({ info: cp.info }),
                    createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)
                });
            }

            // Project Meetings
            const meetings = [
                { subject: "Kick-off Meeting", decisions: "Aprovado escopo inicial; Definido cronograma macro; Alocados recursos-chave", dayOffset: -20 },
                { subject: "Revisão de Requisitos", decisions: "Validados 85% dos requisitos; Pendente integração com sistema legado; Novo prazo para análise técnica", dayOffset: -14 },
                { subject: "Status Report #1", decisions: "Fase de planejamento em dia; Identificados 3 novos riscos; Contratação de especialista aprovada", dayOffset: -7 },
                { subject: "Comitê de Mudanças", decisions: "Aprovada adição de módulo de relatórios; Rejeitada integração com ERP antigo; Contingência liberada para contratações", dayOffset: -3 }
            ];

            for (const mt of meetings) {
                const mtId = nanoid();
                const mtDate = new Date();
                mtDate.setDate(mtDate.getDate() + mt.dayOffset);

                await db.insert(projectMeetings).values({
                    id: mtId,
                    projectId,
                    subject: mt.subject,
                    date: mtDate,
                    decisions: mt.decisions
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'meeting',
                    resourceId: mtId,
                    metadata: JSON.stringify({ subject: mt.subject }),
                    createdAt: mtDate
                });
            }

            // Procurement - Suppliers
            const suppliers = [
                { name: "TechSoft Soluções", itemService: "Licenças de software", contact: "comercial@techsoft.com.br | (65) 3333-1111" },
                { name: "DataCenter Brasil", itemService: "Hospedagem e infraestrutura", contact: "vendas@datacenter.com.br | (11) 4000-2222" },
                { name: "ConsultPro Treinamentos", itemService: "Capacitação e treinamento", contact: "cursos@consultpro.com | (65) 3333-3333" },
                { name: "Equipment Plus", itemService: "Hardware e equipamentos", contact: "cotacao@equipmentplus.com.br | (11) 4000-4444" }
            ];

            for (const sup of suppliers) {
                const supId = nanoid();
                await db.insert(procurementSuppliers).values({
                    id: supId,
                    projectId,
                    name: sup.name,
                    itemService: sup.itemService,
                    contact: sup.contact
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'supplier',
                    resourceId: supId,
                    metadata: JSON.stringify({ name: sup.name, itemService: sup.itemService }),
                    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)
                });
            }

            // Procurement - Contracts
            const contracts = [
                { description: "Contrato de licenciamento anual - TechSoft", value: "R$ 45.000,00", status: "Ativo", validityOffset: 365 },
                { description: "Serviço de cloud - DataCenter Brasil", value: "R$ 8.500,00/mês", status: "Ativo", validityOffset: 180 },
                { description: "Treinamento equipe (40h)", value: "R$ 12.000,00", status: "Concluído", validityOffset: -30 },
                { description: "Aquisição de notebooks (10 unid.)", value: "R$ 85.000,00", status: "Em negociação", validityOffset: 90 }
            ];

            for (const ct of contracts) {
                const ctId = nanoid();
                const validityDate = new Date();
                validityDate.setDate(validityDate.getDate() + ct.validityOffset);

                await db.insert(procurementContracts).values({
                    id: ctId,
                    projectId,
                    description: ct.description,
                    value: ct.value,
                    status: ct.status,
                    validity: validityDate
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'contract',
                    resourceId: ctId,
                    metadata: JSON.stringify({ description: ct.description, value: ct.value, status: ct.status }),
                    createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000)
                });
            }

            // Quality Metrics
            const qualityMetrics = [
                { name: "Cobertura de Testes", target: "80%", currentValue: "65%" },
                { name: "Taxa de Defeitos por Release", target: "< 3", currentValue: "2" },
                { name: "Satisfação do Usuário (NPS)", target: "> 8.0", currentValue: "7.5" },
                { name: "Tempo Médio de Resolução de Bugs", target: "< 4h", currentValue: "3.2h" },
                { name: "Disponibilidade do Sistema", target: "99.5%", currentValue: "99.8%" },
                { name: "Performance (Tempo de Resposta)", target: "< 2s", currentValue: "1.4s" }
            ];

            for (const qm of qualityMetrics) {
                const qmId = nanoid();
                await db.insert(projectQualityMetrics).values({
                    id: qmId,
                    projectId,
                    name: qm.name,
                    target: qm.target,
                    currentValue: qm.currentValue
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'quality_metric',
                    resourceId: qmId,
                    metadata: JSON.stringify({ name: qm.name, target: qm.target }),
                    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
                });
            }

            // Quality Checklists
            const qualityChecklists = [
                { item: "Documentação técnica atualizada", completed: true },
                { item: "Testes unitários implementados", completed: true },
                { item: "Code review realizado", completed: true },
                { item: "Testes de integração executados", completed: false },
                { item: "Testes de performance realizados", completed: false },
                { item: "Validação com usuário-chave", completed: false },
                { item: "Ambiente de homologação configurado", completed: true },
                { item: "Backup e recovery testados", completed: false },
                { item: "Documentação de deploy criada", completed: false },
                { item: "Treinamento da equipe de suporte", completed: false }
            ];

            for (const qc of qualityChecklists) {
                const qcId = nanoid();
                await db.insert(projectQualityChecklists).values({
                    id: qcId,
                    projectId,
                    item: qc.item,
                    completed: qc.completed
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'quality_checklist',
                    resourceId: qcId,
                    metadata: JSON.stringify({ item: qc.item, completed: qc.completed }),
                    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
                });
            }

            // Project Milestones
            const milestones = [
                { name: "Aprovação do Termo de Abertura", phase: "Iniciação", dayOffset: -25 },
                { name: "Conclusão do Levantamento de Requisitos", phase: "Planejamento", dayOffset: -15 },
                { name: "Aprovação do Plano de Projeto", phase: "Planejamento", dayOffset: -5 },
                { name: "Entrega do MVP", phase: "Execução", dayOffset: 30 },
                { name: "Início da Homologação", phase: "Execução", dayOffset: 45 },
                { name: "Go-Live", phase: "Execução", dayOffset: 60 },
                { name: "Encerramento Formal", phase: "Encerramento", dayOffset: 75 }
            ];

            for (const ms of milestones) {
                const msId = nanoid();
                const msDate = new Date();
                msDate.setDate(msDate.getDate() + ms.dayOffset);

                await db.insert(projectMilestones).values({
                    id: msId,
                    projectId,
                    name: ms.name,
                    expectedDate: msDate,
                    phase: ms.phase
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'milestone',
                    resourceId: msId,
                    metadata: JSON.stringify({ name: ms.name, phase: ms.phase }),
                    createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000)
                });
            }

            // Project Dependencies
            const dependencies = [
                { predecessor: "Levantamento de Requisitos", successor: "Design de Arquitetura", type: "TI" },
                { predecessor: "Design de Arquitetura", successor: "Desenvolvimento", type: "TI" },
                { predecessor: "Desenvolvimento", successor: "Testes Unitários", type: "TI" },
                { predecessor: "Testes Unitários", successor: "Testes de Integração", type: "TI" },
                { predecessor: "Homologação", successor: "Treinamento", type: "TI" },
                { predecessor: "Contratação de Licenças", successor: "Configuração de Ambiente", type: "TI" }
            ];

            for (const dep of dependencies) {
                const depId = nanoid();
                await db.insert(projectDependencies).values({
                    id: depId,
                    projectId,
                    predecessor: dep.predecessor,
                    successor: dep.successor,
                    type: dep.type
                });

                await db.insert(auditLogs).values({
                    id: nanoid(),
                    userId: p.userId,
                    organizationId: p.orgId,
                    action: 'CREATE',
                    resource: 'dependency',
                    resourceId: depId,
                    metadata: JSON.stringify({ predecessor: dep.predecessor, successor: dep.successor, type: dep.type }),
                    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
                });
            }

            // Project Charter (TAP)
            const charterId = nanoid();
            await db.insert(projectCharters).values({
                id: charterId,
                projectId,
                justification: `## Justificativa\n\nEste projeto é essencial para modernizar os processos internos e melhorar a eficiência operacional. A implementação trará:\n\n- **Redução de 40%** no tempo de processamento\n- **Economia de R$ 200.000/ano** em custos operacionais\n- **Melhoria de 30%** na satisfação dos usuários\n\n### Alinhamento Estratégico\nO projeto está alinhado com o Objetivo Estratégico #3: "Transformação Digital dos Serviços Públicos" do Plano de Governo 2025-2028.`,
                smartObjectives: `## Objetivos SMART\n\n### Objetivo Principal\nImplantar o sistema até 30/06/2026, atendendo 100% dos requisitos funcionais, com orçamento máximo de R$ 500.000.\n\n### Objetivos Específicos\n\n1. **S (Específico)**: Implementar módulos de gestão de projetos, relatórios e dashboards\n2. **M (Mensurável)**: Atingir 95% de cobertura de testes e NPS > 8.0\n3. **A (Alcançável)**: Utilizar equipe capacitada e metodologia ágil comprovada\n4. **R (Relevante)**: Atender diretamente às necessidades da secretaria\n5. **T (Temporal)**: Entregar MVP em 90 dias, versão final em 180 dias`,
                successCriteria: `## Critérios de Sucesso\n\n### Critérios Obrigatórios\n- [ ] Sistema em produção até a data limite\n- [ ] Todos os requisitos críticos implementados\n- [ ] Orçamento dentro do planejado (máximo +10%)\n- [ ] Treinamento de 100% dos usuários-chave\n\n### Critérios Desejáveis\n- [ ] NPS dos usuários > 8.0\n- [ ] Tempo de resposta < 2 segundos\n- [ ] Zero bugs críticos em produção por 30 dias\n\n### Critérios de Aceite\n- Homologação formal pelo patrocinador\n- Relatório de testes aprovado\n- Documentação técnica completa`
            });

            await db.insert(auditLogs).values({
                id: nanoid(),
                userId: p.userId,
                organizationId: p.orgId,
                action: 'CREATE',
                resource: 'project_charter',
                resourceId: charterId,
                metadata: JSON.stringify({ projectId, projectName: p.name }),
                createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)
            });

            console.log(`   ✅ ${p.name} - All data seeded`);
        }

        // Final statistics
        const [projectCount] = await db.select({ count: sql<number>`count(*)::int` }).from(projects);
        const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks);
        const [auditCount] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);

        console.log('\n📊 Seeding Statistics:');
        console.log(`   📁 Projects: ${projectCount.count}`);
        console.log(`   ✅ Tasks: ${taskCount.count}`);
        console.log(`   📝 Audit Logs: ${auditCount.count}`);
        console.log('\n✅ Comprehensive seeding complete!');

    } catch (e) {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seed();
