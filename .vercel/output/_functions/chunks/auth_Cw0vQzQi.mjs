import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgEnum, pgTable, timestamp, text, primaryKey, boolean, serial, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const globalRolesEnum = pgEnum("global_roles", ["super_admin", "user"]);
const orgRolesEnum = pgEnum("org_roles", ["secretario", "gestor", "viewer"]);
const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  logoUrl: text("logo_url"),
  secretario: text("secretario"),
  secretariaAdjunta: text("secretaria_adjunta"),
  diretoriaTecnica: text("diretoria_tecnica"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const memberships = pgTable("memberships", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: orgRolesEnum("role").notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.organizationId] })
}));
const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "set null" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  globalRole: globalRolesEnum("global_role").default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});
const accounts = pgTable("accounts", {
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
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id").notNull().references(() => users.id),
  organizationId: text("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const stakeholders = pgTable("stakeholders", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  level: text("level").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const boardColumns = pgTable("board_columns", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: serial("order"),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const boardCards = pgTable("board_cards", {
  id: text("id").primaryKey(),
  columnId: text("column_id").notNull().references(() => boardColumns.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("medium"),
  order: serial("order"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const knowledgeAreas = pgTable("knowledge_areas", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  area: text("area").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const projectPhases = pgTable("project_phases", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: serial("order"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  phaseId: text("phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  stakeholderId: text("stakeholder_id").references(() => stakeholders.id, { onDelete: "set null" }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  order: serial("order"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  key: text("key").notNull(),
  url: text("url"),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  // 'task', 'project', 'comment'
  uploadedBy: text("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const attachmentsRelations = relations(attachments, ({ one }) => ({
  user: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id]
  })
}));

const schema = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    accounts,
    appointments,
    attachments,
    attachmentsRelations,
    auditLogs,
    boardCards,
    boardColumns,
    globalRolesEnum,
    knowledgeAreas,
    memberships,
    orgRolesEnum,
    organizations,
    projectPhases,
    projects,
    sessions,
    stakeholders,
    tasks,
    users,
    verifications
}, Symbol.toStringTag, { value: 'Module' }));

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_inDhzfvW4GX2@ep-bold-sun-acc5m4va-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4321",
  database: drizzleAdapter(db, {
    provider: "pg",
    // or "mysql", "sqlite"
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications
    }
  }),
  emailAndPassword: {
    enabled: true
  },
  user: {
    additionalFields: {
      globalRole: {
        type: "string",
        required: false,
        defaultValue: "user"
      }
    }
  },
  trustedOrigins: ["http://localhost:4321", "http://127.0.0.1:4321", "http://localhost:4322", "http://127.0.0.1:4322"]
  // Add other providers here
});

export { auth as a, auditLogs as b, projectPhases as c, db as d, appointments as e, attachments as f, knowledgeAreas as k, memberships as m, organizations as o, projects as p, stakeholders as s, tasks as t, users as u };
