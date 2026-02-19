import { pgTable, text, serial, timestamp, boolean, pgEnum, primaryKey, integer, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const globalRolesEnum = pgEnum("global_roles", ["super_admin", "user"]);
export const orgRolesEnum = pgEnum("org_roles", ["secretario", "gestor", "viewer"]);

export const organizations = pgTable("organizations", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    logoUrl: text("logo_url"),
    secretario: text("secretario"),
    secretariaAdjunta: text("secretaria_adjunta"),
    diretoriaTecnica: text("diretoria_tecnica"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const memberships = pgTable("memberships", {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    role: orgRolesEnum("role").notNull(),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.organizationId] }),
    userIdIdx: index('membership_user_idx').on(t.userId),
    orgIdIdx: index('membership_org_idx').on(t.organizationId),
}));

export const auditLogs = pgTable("audit_logs", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'set null' }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: 'set null' }),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
    userActionIdx: index('audit_user_action_idx').on(t.userId, t.action),
    resourceIdx: index('audit_resource_idx').on(t.resource, t.resourceId),
    orgIdx: index('audit_org_idx').on(t.organizationId),
}));

export const users = pgTable("users", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    phone: text("phone"),
    funcao: text("funcao"),
    globalRole: globalRolesEnum("global_role").default("user"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    activeOrganizationId: text("active_organization_id").references(() => organizations.id, { onDelete: 'set null' }),
}, (t) => ({
    userIdIdx: index('session_user_idx').on(t.userId),
}));

export const accounts = pgTable("accounts", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    userIdIdx: index('account_user_idx').on(t.userId),
}));

export const verifications = pgTable("verifications", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    userId: text("user_id").notNull().references(() => users.id),
    organizationId: text("organization_id").references(() => organizations.id),
    type: text("type").notNull().default('Projeto'), // 'Obra', 'Trabalho Social', 'Programa', etc.
    status: text("status").notNull().default('em_andamento'), // 'em_andamento', 'concluido', 'suspenso', 'cancelado'
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    userIdIdx: index('project_user_idx').on(t.userId),
    orgIdIdx: index('project_org_idx').on(t.organizationId),
    statusIdx: index('project_status_idx').on(t.status),
    typeIdx: index('project_type_idx').on(t.type),
    orgStatusIdx: index('project_org_status_idx').on(t.organizationId, t.status),
}));

export const stakeholders = pgTable("stakeholders", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    role: text("role").notNull(),
    level: text("level").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('stakeholder_project_idx').on(t.projectId),
}));

export const boardColumns = pgTable("board_columns", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    order: serial("order"),
    color: text("color"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('board_col_project_idx').on(t.projectId),
}));

export const boardCards = pgTable("board_cards", {
    id: text("id").primaryKey(),
    columnId: text("column_id").notNull().references(() => boardColumns.id, { onDelete: 'cascade' }),
    content: text("content").notNull(),
    priority: text("priority").notNull().default('medium'),
    order: serial("order"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    columnIdIdx: index('board_card_col_idx').on(t.columnId),
}));

export const knowledgeAreas = pgTable("knowledge_areas", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    area: text("area").notNull(),
    content: text("content"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('karea_project_idx').on(t.projectId),
    projectAreaIdx: index('karea_project_area_idx').on(t.projectId, t.area),
}));

export const projectPhases = pgTable("project_phases", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    description: text("description"),
    order: serial("order"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('phase_project_idx').on(t.projectId),
}));

export const tasks = pgTable("tasks", {
    id: text("id").primaryKey(),
    phaseId: text("phase_id").notNull().references(() => projectPhases.id, { onDelete: 'cascade' }),
    title: text("title").notNull(),
    description: text("description"),
    assigneeId: text("assignee_id").references(() => users.id, { onDelete: 'set null' }),
    stakeholderId: text("stakeholder_id").references(() => stakeholders.id, { onDelete: 'set null' }),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    status: text("status").notNull().default('todo'),
    priority: text("priority").notNull().default('medium'),
    order: serial("order"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    phaseIdIdx: index('task_phase_idx').on(t.phaseId),
    assigneeIdIdx: index('task_assignee_idx').on(t.assigneeId),
    statusIdx: index('task_status_idx').on(t.status),
    priorityIdx: index('task_priority_idx').on(t.priority),
    datesIdx: index('task_dates_idx').on(t.startDate, t.endDate),
}));

export const appointments = pgTable("appointments", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    description: text("description").notNull(),
    date: timestamp("date").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('appointment_project_idx').on(t.projectId),
    dateIdx: index('appointment_date_idx').on(t.date),
}));

export const attachments = pgTable("attachments", {
    id: text("id").primaryKey(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    key: text("key").notNull(),
    url: text("url"),
    variants: jsonb("variants").$type<{
        thumb?: string
        medium?: string
        optimized?: string
    } | null>(),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(), // 'task', 'project', 'comment'
    uploadedBy: text("uploaded_by").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    entityIdx: index('attachment_entity_idx').on(t.entityId, t.entityType),
    uploaderIdx: index('attachment_uploader_idx').on(t.uploadedBy),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
    user: one(users, {
        fields: [attachments.uploadedBy],
        references: [users.id],
    }),
}));

export const knowledgeAreaChanges = pgTable("knowledge_area_changes", {
    id: text("id").primaryKey(),
    knowledgeAreaId: text("knowledge_area_id").notNull().references(() => knowledgeAreas.id, { onDelete: 'cascade' }),
    description: text("description").notNull(),
    type: text("type").notNull(), // 'Escopo', 'Cronograma', 'Custos', etc.
    status: text("status").notNull(), // 'Solicitado', 'Aprovado', 'Rejeitado', etc.
    date: timestamp("date").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    kaIdIdx: index('ka_change_ka_idx').on(t.knowledgeAreaId),
}));

export const projectCharters = pgTable("project_charters", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    justification: text("justification"),
    smartObjectives: text("smart_objectives"),
    successCriteria: text("success_criteria"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('charter_project_idx').on(t.projectId),
}));

export const projectMilestones = pgTable("project_milestones", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    expectedDate: timestamp("expected_date").notNull(),
    phase: text("phase").notNull(), // Iniciação, Planejamento, Execução, Monitoramento, Encerramento
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('milestone_project_idx').on(t.projectId),
}));

export const projectDependencies = pgTable("project_dependencies", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    predecessor: text("predecessor").notNull(),
    successor: text("successor").notNull(),
    type: text("type").notNull(), // TI (Término-Início), II (Início-Início), TT (Término-Término)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('dependency_project_idx').on(t.projectId),
}));

export const projectQualityMetrics = pgTable("project_quality_metrics", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    target: text("target").notNull(),
    currentValue: text("current_value").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('quality_metric_project_idx').on(t.projectId),
}));

export const projectQualityChecklists = pgTable("project_quality_checklists", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    item: text("item").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('quality_checklist_project_idx').on(t.projectId),
}));

export const projectCommunicationPlans = pgTable("project_communication_plans", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    info: text("info").notNull(), // "O que será comunicado"
    stakeholders: text("stakeholders").notNull(), // "Para Quem"
    frequency: text("frequency").notNull(), // "Quando"
    medium: text("medium").notNull(), // "Meio"
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('comm_plan_project_idx').on(t.projectId),
}));

export const projectMeetings = pgTable("project_meetings", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    subject: text("subject").notNull(), // "Assunto"
    date: timestamp("date").notNull(), // "Data"
    decisions: text("decisions").notNull(), // "Principais Decisões"
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('meeting_project_idx').on(t.projectId),
}));

export const procurementSuppliers = pgTable("procurement_suppliers", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    itemService: text("item_service").notNull(),
    contact: text("contact").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('supplier_project_idx').on(t.projectId),
}));

export const procurementContracts = pgTable("procurement_contracts", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
    description: text("description").notNull(),
    value: text("value").notNull(),
    validity: timestamp("validity"), // Changed to timestamp to match date picker usage
    status: text("status").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    projectIdIdx: index('contract_project_idx').on(t.projectId),
}));

// RELATIONS
export const projectsRelations = relations(projects, ({ one, many }) => ({
    organization: one(organizations, {
        fields: [projects.organizationId],
        references: [organizations.id],
    }),
    user: one(users, {
        fields: [projects.userId],
        references: [users.id],
    }),
    phases: many(projectPhases),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
    projects: many(projects),
    members: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
    user: one(users, {
        fields: [memberships.userId],
        references: [users.id],
    }),
    organization: one(organizations, {
        fields: [memberships.organizationId],
        references: [organizations.id],
    }),
}));

export const projectPhasesRelations = relations(projectPhases, ({ one, many }) => ({
    project: one(projects, {
        fields: [projectPhases.projectId],
        references: [projects.id],
    }),
    tasks: many(tasks),
}));

// ... (previous relations)

export const invitations = pgTable("invitations", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    role: text("role").notNull().default('user'),
    organizationId: text("organization_id"), // Optional: invite to platform vs specific org
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: text("inviter_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text("status").notNull().default('pending'), // 'pending', 'accepted'
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
    tokenIdx: index('invitation_token_idx').on(t.token),
    emailIdx: index('invitation_email_idx').on(t.email),
    orgIdIdx: index('invitation_org_idx').on(t.organizationId),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
    inviter: one(users, {
        fields: [invitations.inviterId],
        references: [users.id],
    }),
    organization: one(organizations, {
        fields: [invitations.organizationId],
        references: [organizations.id],
    }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
    phase: one(projectPhases, {
        fields: [tasks.phaseId],
        references: [projectPhases.id],
    }),
    assignee: one(users, {
        fields: [tasks.assigneeId],
        references: [users.id],
    }),
    stakeholder: one(stakeholders, {
        fields: [tasks.stakeholderId],
        references: [stakeholders.id],
    }),
}));

// Export admin notification schemas
export * from "./admin-notifications";

// Re-export notifications schema
export * from './notifications';
