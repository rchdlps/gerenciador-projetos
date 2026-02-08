CREATE TYPE "public"."global_roles" AS ENUM('super_admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."org_roles" AS ENUM('secretario', 'gestor', 'viewer');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"description" text NOT NULL,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"key" text NOT NULL,
	"url" text,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"column_id" text NOT NULL,
	"content" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"order" serial NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_columns" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"order" serial NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"organization_id" text,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "knowledge_area_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"knowledge_area_id" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"area" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" "org_roles" NOT NULL,
	CONSTRAINT "memberships_user_id_organization_id_pk" PRIMARY KEY("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"logo_url" text,
	"secretario" text,
	"secretaria_adjunta" text,
	"diretoria_tecnica" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"description" text NOT NULL,
	"value" text NOT NULL,
	"validity" timestamp,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"item_service" text NOT NULL,
	"contact" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_charters" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"justification" text,
	"smart_objectives" text,
	"success_criteria" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_communication_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"info" text NOT NULL,
	"stakeholders" text NOT NULL,
	"frequency" text NOT NULL,
	"medium" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"predecessor" text NOT NULL,
	"successor" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"subject" text NOT NULL,
	"date" timestamp NOT NULL,
	"decisions" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"expected_date" timestamp NOT NULL,
	"phase" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_phases" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" serial NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_quality_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"item" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_quality_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"target" text NOT NULL,
	"current_value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" text NOT NULL,
	"organization_id" text,
	"type" text DEFAULT 'Projeto' NOT NULL,
	"status" text DEFAULT 'em_andamento' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stakeholders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"level" text NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"phase_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assignee_id" text,
	"stakeholder_id" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"order" serial NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"global_role" "global_roles" DEFAULT 'user',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_cards" ADD CONSTRAINT "board_cards_column_id_board_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."board_columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_area_changes" ADD CONSTRAINT "knowledge_area_changes_knowledge_area_id_knowledge_areas_id_fk" FOREIGN KEY ("knowledge_area_id") REFERENCES "public"."knowledge_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_areas" ADD CONSTRAINT "knowledge_areas_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_contracts" ADD CONSTRAINT "procurement_contracts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_suppliers" ADD CONSTRAINT "procurement_suppliers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_charters" ADD CONSTRAINT "project_charters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_communication_plans" ADD CONSTRAINT "project_communication_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quality_checklists" ADD CONSTRAINT "project_quality_checklists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quality_metrics" ADD CONSTRAINT "project_quality_metrics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_organization_id_organizations_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_project_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "public"."stakeholders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "appointment_project_idx" ON "appointments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "appointment_date_idx" ON "appointments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attachment_entity_idx" ON "attachments" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "attachment_uploader_idx" ON "attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "audit_user_action_idx" ON "audit_logs" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_logs" USING btree ("resource","resource_id");--> statement-breakpoint
CREATE INDEX "audit_org_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "board_card_col_idx" ON "board_cards" USING btree ("column_id");--> statement-breakpoint
CREATE INDEX "board_col_project_idx" ON "board_columns" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invitation_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_org_idx" ON "invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ka_change_ka_idx" ON "knowledge_area_changes" USING btree ("knowledge_area_id");--> statement-breakpoint
CREATE INDEX "karea_project_idx" ON "knowledge_areas" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "membership_org_idx" ON "memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contract_project_idx" ON "procurement_contracts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "supplier_project_idx" ON "procurement_suppliers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "charter_project_idx" ON "project_charters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "comm_plan_project_idx" ON "project_communication_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dependency_project_idx" ON "project_dependencies" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "meeting_project_idx" ON "project_meetings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "milestone_project_idx" ON "project_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "phase_project_idx" ON "project_phases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "quality_checklist_project_idx" ON "project_quality_checklists" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "quality_metric_project_idx" ON "project_quality_metrics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_org_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_type_idx" ON "projects" USING btree ("type");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stakeholder_project_idx" ON "stakeholders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_phase_idx" ON "tasks" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "task_assignee_idx" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "task_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_priority_idx" ON "tasks" USING btree ("priority");