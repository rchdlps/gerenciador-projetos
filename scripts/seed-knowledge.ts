import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../db/schema';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error("No DATABASE_URL");

const client = new Pool({ connectionString });
const db = drizzle(client, { schema });

const AREAS = [
    { id: "integracao", title: "Integração", content: "## Plano de Integração\nCoordenação central de todas as atividades do projeto. Foco em autorização e transição entre fases." },
    { id: "escopo", title: "Escopo", content: "## Definição de Escopo\nLista de entregáveis e critérios de aceitação. Inclusão de EAP (Estrutura Analítica do Projeto)." },
    { id: "cronograma", title: "Cronograma", content: "## Gestão de Prazos\nMarcos críticos e dependências. Uso de caminho crítico para garantir entregas no prazo." },
    { id: "custos", title: "Custos", content: "## Orçamento e Controle\nAlocação de recursos financeiros por fase. Monitoramento de desvios através de Valor Agregado." },
    { id: "qualidade", title: "Qualidade", content: "## Padrões de Qualidade\nProtocolos de teste e critérios de conformidade técnica. Revisões por pares e checklists." },
    { id: "recursos", title: "Recursos", content: "## Gestão de Equipe\nAlocação de papéis e responsabilidades (Matriz RACI). Gestão de recursos físicos e equipamentos." },
    { id: "comunicacao", title: "Comunicação", content: "## Plano de Comunicação\nFluxo de informação entre stakeholders. Frequência de relatórios de status e canais oficiais." },
    { id: "riscos", title: "Riscos", content: "## Gestão de Riscos\nRegistro de riscos, impacto vs probabilidade. Planos de contingência para riscos de alta prioridade." },
    { id: "aquisicoes", title: "Aquisições", content: "## Contratações e Compras\nGestão de fornecedores externos e contratos. SLAs e critérios de seleção de parceiros." },
    { id: "partes", title: "Partes Interessadas", content: "## Engajamento de Stakeholders\nMapeamento de influência e interesse. Estratégias de engajamento para apoio ao projeto." },
];

async function seed() {
    console.log("🚀 Iniciando semeação abrangente de dados...");
    try {
        const projects = await db.select().from(schema.projects);
        console.log(`📂 Encontrados ${projects.length} projetos.`);

        for (const project of projects) {
            console.log(`\n--- Projeto: ${project.name} ---`);

            // 1. Seed TAP (Integration Charter)
            const [existingTap] = await db.select().from(schema.projectCharters).where(eq(schema.projectCharters.projectId, project.id));
            if (!existingTap) {
                await db.insert(schema.projectCharters).values({
                    id: nanoid(),
                    projectId: project.id,
                    justification: `Justificativa estratégica para o projeto ${project.name}, visando atender às metas estabelecidas para 2026.`,
                    smartObjectives: `1. Entregar 100% dos requisitos em 6 meses.\n2. Manter custos dentro de 5% de margem.\n3. Zero incidentes críticos de segurança.`,
                    successCriteria: `Aprovação final pela Diretoria Técnica e feedback positivo dos stakeholders primários.`
                });
                console.log("✅ TAP semeado.");
            }

            // 2. Seed Knowledge Areas and Changes
            for (const areaDef of AREAS) {
                // Upsert Area Content
                const [existingKa] = await db.select().from(schema.knowledgeAreas).where(
                    and(
                        eq(schema.knowledgeAreas.projectId, project.id),
                        eq(schema.knowledgeAreas.area, areaDef.id)
                    )
                );

                let kaId = "";
                if (!existingKa) {
                    const [newKa] = await db.insert(schema.knowledgeAreas).values({
                        id: nanoid(),
                        projectId: project.id,
                        area: areaDef.id,
                        content: areaDef.content
                    }).returning();
                    kaId = newKa.id;
                    console.log(`   📝 Área [${areaDef.title}] criada.`);
                } else {
                    kaId = existingKa.id;
                    // Optional: Update content if needed
                }

                // 3. Seed sample Changes for each area (if none exist)
                const existingChanges = await db.select().from(schema.knowledgeAreaChanges).where(eq(schema.knowledgeAreaChanges.knowledgeAreaId, kaId));
                if (existingChanges.length === 0) {
                    await db.insert(schema.knowledgeAreaChanges).values([
                        {
                            id: nanoid(),
                            knowledgeAreaId: kaId,
                            description: `Ajuste inicial de planejamento em ${areaDef.title}`,
                            type: areaDef.title,
                            status: "Aprovado",
                            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
                        },
                        {
                            id: nanoid(),
                            knowledgeAreaId: kaId,
                            description: `Revisão de requisitos solicitada pela gerência`,
                            type: areaDef.title,
                            status: "Solicitado",
                            date: new Date()
                        }
                    ]);
                    console.log(`      ➕ 2 mudanças semeadas.`);
                }
            }

            // 4. Seed Schedule Specifics (Milestones & Dependencies)
            const existingMilestones = await db.select().from(schema.projectMilestones).where(eq(schema.projectMilestones.projectId, project.id));
            if (existingMilestones.length === 0) {
                await db.insert(schema.projectMilestones).values([
                    {
                        id: nanoid(),
                        projectId: project.id,
                        name: "Aprovação do Plano de Projeto",
                        expectedDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                        phase: "Planejamento"
                    },
                    {
                        id: nanoid(),
                        projectId: project.id,
                        name: "Kick-off da Execução",
                        expectedDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                        phase: "Planejamento"
                    },
                    {
                        id: nanoid(),
                        projectId: project.id,
                        name: "Entrega do Primeiro Protótipo",
                        expectedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                        phase: "Execução"
                    }
                ]);
                console.log("📅 3 marcos semeados.");
            }

            const existingDeps = await db.select().from(schema.projectDependencies).where(eq(schema.projectDependencies.projectId, project.id));
            if (existingDeps.length === 0) {
                await db.insert(schema.projectDependencies).values([
                    {
                        id: nanoid(),
                        projectId: project.id,
                        predecessor: "Definição de Requisitos",
                        successor: "Desenvolvimento do Backend",
                        type: "TI"
                    },
                    {
                        id: nanoid(),
                        projectId: project.id,
                        predecessor: "Design de Interface",
                        successor: "Desenvolvimento do Frontend",
                        type: "TI"
                    }
                ]);
                // ... existing logs ...
            }

            // 5. Seed Quality Specifics (Metrics & Checklist)
            const existingMetrics = await db.select().from(schema.projectQualityMetrics).where(eq(schema.projectQualityMetrics.projectId, project.id));
            if (existingMetrics.length === 0) {
                await db.insert(schema.projectQualityMetrics).values([
                    {
                        id: nanoid(),
                        projectId: project.id,
                        name: "Taxa de Defeitos",
                        target: "< 2%",
                        currentValue: "1.5%"
                    },
                    {
                        id: nanoid(),
                        projectId: project.id,
                        name: "Cobertura de Testes",
                        target: "> 80%",
                        currentValue: "75%"
                    }
                ]);
                console.log("⭐ 2 métricas de qualidade semeadas.");
            }

            const existingChecklist = await db.select().from(schema.projectQualityChecklists).where(eq(schema.projectQualityChecklists.projectId, project.id));
            if (existingChecklist.length === 0) {
                await db.insert(schema.projectQualityChecklists).values([
                    {
                        id: nanoid(),
                        projectId: project.id,
                        item: "Revisão de código concluída",
                        completed: true
                    },
                    {
                        id: nanoid(),
                        projectId: project.id,
                        item: "Testes unitários aprovados",
                        completed: false
                    },
                    {
                        id: nanoid(),
                        projectId: project.id,
                        item: "Documentação técnica atualizada",
                        completed: false
                    }
                ]);
                console.log("✅ 3 itens de checklist semeados.");
            }
        }
        console.log("\n✨ Semeação concluída com sucesso!");
    } catch (e) {
        console.error("❌ Erro na semeação:", e);
    } finally {
        process.exit(0);
    }
}

seed();
