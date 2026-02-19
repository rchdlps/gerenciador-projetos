CREATE TABLE "notification_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"user_id" text NOT NULL,
	"delivered_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"failed" boolean DEFAULT false NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "notification_send_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"organization_id" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"link" text,
	"target_type" text NOT NULL,
	"target_count" integer NOT NULL,
	"sent_count" integer NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"organization_id" text,
	"target_type" text NOT NULL,
	"target_ids" text[],
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"link" text,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "variants" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "funcao" text;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_send_logs" ADD CONSTRAINT "notification_send_logs_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_send_logs" ADD CONSTRAINT "notification_send_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_notif_user_idx" ON "notification_deliveries" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX "delivery_user_idx" ON "notification_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "send_logs_creator_sent_idx" ON "notification_send_logs" USING btree ("creator_id","sent_at");--> statement-breakpoint
CREATE INDEX "send_logs_org_idx" ON "notification_send_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scheduled_notif_status_scheduled_idx" ON "scheduled_notifications" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "scheduled_notif_creator_status_idx" ON "scheduled_notifications" USING btree ("creator_id","status","scheduled_for");--> statement-breakpoint
CREATE INDEX "scheduled_notif_org_idx" ON "scheduled_notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "karea_project_area_idx" ON "knowledge_areas" USING btree ("project_id","area");--> statement-breakpoint
CREATE INDEX "project_org_status_idx" ON "projects" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "task_dates_idx" ON "tasks" USING btree ("start_date","end_date");