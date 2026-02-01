import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { nanoid } from 'nanoid';
import { users, accounts, projects, stakeholders, boardColumns, boardCards, knowledgeAreas, sessions } from './schema';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in .env');
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
    console.log('🌱 Seeding database...');

    try {
        // 1. Find or Create User
        // We want to attach projects to the existing user so they show up in the dashboard.
        const existingUsers = await db.select().from(users).limit(1);
        let userId: string;

        if (existingUsers.length > 0) {
            userId = existingUsers[0].id;
            console.log(`👤 Using existing user: ${existingUsers[0].email} (${userId})`);
        } else {
            userId = nanoid();
            const user = {
                id: userId,
                name: "Admin User",
                email: "admin@example.com",
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await db.insert(users).values(user);
            console.log('👤 Created User:', user.email);
        }

        // 2. Clean up Project Data Only (Safety: Don't delete users/sessions)
        // We delete all projects to avoid duplicates if re-running. 
        // Cascades should handle child tables (stakeholders, boardCards, etc.), but Drizzle + foreign keys 
        // handling depends on schema definition. Our schema has onDelete: 'cascade', so deleting projects is enough.
        // However, safely deleting children first is often good practice if cascades fail.
        await db.delete(knowledgeAreas);
        await db.delete(boardCards);
        await db.delete(boardColumns);
        await db.delete(stakeholders);
        await db.delete(projects);

        console.log('🧹 Cleaned up existing project data');

        // 3. Define Projects to Seed
        const projectsData = [
            {
                name: "Implantação do Sistema ERP",
                description: "Migração e implantação do novo sistema integrado de gestão (SAP/Oracle) para otimizar processos financeiros e contábeis.",
                stakeholders: [
                    { name: "Roberto Silva", role: "Diretor Financeiro", level: "patrocinador" },
                    { name: "Ana Martins", role: "Gerente de TI", level: "gerente" },
                    { name: "Carlos Souza", role: "Líder Técnico", level: "equipe" },
                ],
                columns: "todo-doing-done",
                knowledgeAreas: [
                    { area: "integracao", content: "Termo de Abertura assinado. Cronograma base definido." },
                    { area: "custos", content: "Orçamento de R$ 1.5M aprovado com margem de 10%." },
                ]
            },
            {
                name: "Novo App Mobile (iOS/Android)",
                description: "Desenvolvimento do aplicativo mobile nativo para clientes, focado em experiência do usuário e performance.",
                stakeholders: [
                    { name: "Juliana Costa", role: "Head de Produto", level: "patrocinador" },
                    { name: "Marcos Oliveira", role: "Tech Lead", level: "equipe" },
                    { name: "Fernanda Lima", role: "UX Designer", level: "equipe" },
                ],
                columns: "kanban",
                knowledgeAreas: [
                    { area: "escopo", content: "MVP definido: Login, Home, Perfil e Lista de Pedidos." },
                    { area: "qualidade", content: "Testes automatizados cobrindo 80% do código. QA manual semanal." },
                ]
            },
            {
                name: "Migração para Nuvem AWS",
                description: "Migração da infraestrutura on-premise para AWS, visando escalabilidade e redução de custos operacionais.",
                stakeholders: [
                    { name: "Pedro Santos", role: "CTO", level: "patrocinador" },
                    { name: "Lucas Pereira", role: "DevOps", level: "equipe" },
                ],
                columns: "simple",
                knowledgeAreas: [
                    { area: "riscos", content: "Risco de downtime durante a virada do banco de dados." },
                    { area: "aquisicoes", content: "Contratos com AWS e fornecedores de suporte revisados." },
                ]
            }
        ];

        for (const p of projectsData) {
            const projectId = nanoid();
            await db.insert(projects).values({
                id: projectId,
                name: p.name,
                description: p.description,
                userId: userId,
            });

            // Stakeholders
            if (p.stakeholders.length > 0) {
                await db.insert(stakeholders).values(
                    p.stakeholders.map(s => ({
                        id: nanoid(),
                        projectId,
                        name: s.name,
                        role: s.role,
                        level: s.level
                    }))
                );
            }

            // Board - Create standard columns
            const col1 = nanoid();
            const col2 = nanoid();
            const col3 = nanoid();

            // Default "To Do, Doing, Done"
            await db.insert(boardColumns).values([
                { id: col1, projectId, name: "A Fazer", order: 0 },
                { id: col2, projectId, name: "Em Andamento (WIP)", order: 1 },
                { id: col3, projectId, name: "Concluído", order: 2, color: "green" },
            ]);

            // Add some cards
            await db.insert(boardCards).values([
                { id: nanoid(), columnId: col1, content: "Kickoff do projeto", priority: "high", order: 0 },
                { id: nanoid(), columnId: col1, content: "Levantamento de requisitos", priority: "medium", order: 1 },
                { id: nanoid(), columnId: col2, content: " Análise preliminar", priority: "low", order: 0 },
            ]);


            // Knowledge Areas
            if (p.knowledgeAreas && p.knowledgeAreas.length > 0) {
                await db.insert(knowledgeAreas).values(
                    p.knowledgeAreas.map(k => ({
                        id: nanoid(),
                        projectId,
                        area: k.area,
                        content: k.content
                    }))
                );
            }

            console.log(`🚀 Seeded project: ${p.name}`);
        }

        console.log('✅ Seeding complete! 3 Projects created.');

    } catch (e) {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seed();
