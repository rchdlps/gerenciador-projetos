import { pgTable, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, organizations } from "./schema";
import { notifications } from "./notifications";

/**
 * Scheduled Notifications
 * Stores notifications that are scheduled to be sent in the future
 */
export const scheduledNotifications = pgTable("scheduled_notifications", {
    id: text("id").primaryKey(),
    creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: 'cascade' }), // null for system-wide

    // Targeting
    targetType: text("target_type").notNull(), // 'user', 'organization', 'role', 'multi-org', 'all'
    targetIds: text("target_ids").array(), // user IDs, org IDs, etc. (JSON array in postgres)

    // Content
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(), // 'activity' or 'system'
    priority: text("priority").notNull().default('normal'), // 'normal', 'high', 'urgent'
    link: text("link"), // optional action link

    // Scheduling
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: text("status").notNull().default('pending'), // 'pending', 'sent', 'cancelled', 'failed'
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failureReason: text("failure_reason"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    statusScheduledIdx: index('scheduled_notif_status_scheduled_idx').on(t.status, t.scheduledFor),
    creatorIdx: index('scheduled_notif_creator_idx').on(t.creatorId),
    orgIdx: index('scheduled_notif_org_idx').on(t.organizationId),
}));

/**
 * Notification Deliveries
 * Tracks delivery status for each notification sent to each user
 */
export const notificationDeliveries = pgTable("notification_deliveries", {
    id: text("id").primaryKey(),
    notificationId: text("notification_id").notNull().references(() => notifications.id, { onDelete: 'cascade' }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Delivery tracking
    deliveredAt: timestamp("delivered_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
    failed: boolean("failed").notNull().default(false),
    errorMessage: text("error_message"),
}, (t) => ({
    notifUserIdx: index('delivery_notif_user_idx').on(t.notificationId, t.userId),
    userIdx: index('delivery_user_idx').on(t.userId),
}));

/**
 * Notification Send Logs
 * Audit trail of all notification sends (for admin history view)
 */
export const notificationSendLogs = pgTable("notification_send_logs", {
    id: text("id").primaryKey(),
    creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),

    // What was sent
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(),
    priority: text("priority").notNull().default('normal'),
    link: text("link"),

    // Targeting info
    targetType: text("target_type").notNull(),
    targetCount: integer("target_count").notNull(), // how many users targeted
    sentCount: integer("sent_count").notNull(), // how many actually sent
    failedCount: integer("failed_count").notNull().default(0),

    // Timestamp
    sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (t) => ({
    creatorSentIdx: index('send_logs_creator_sent_idx').on(t.creatorId, t.sentAt),
    orgIdx: index('send_logs_org_idx').on(t.organizationId),
}));

// Relations
export const scheduledNotificationsRelations = relations(scheduledNotifications, ({ one }) => ({
    creator: one(users, {
        fields: [scheduledNotifications.creatorId],
        references: [users.id],
    }),
    organization: one(organizations, {
        fields: [scheduledNotifications.organizationId],
        references: [organizations.id],
    }),
}));

export const notificationDeliveriesRelations = relations(notificationDeliveries, ({ one }) => ({
    notification: one(notifications, {
        fields: [notificationDeliveries.notificationId],
        references: [notifications.id],
    }),
    user: one(users, {
        fields: [notificationDeliveries.userId],
        references: [users.id],
    }),
}));

export const notificationSendLogsRelations = relations(notificationSendLogs, ({ one }) => ({
    creator: one(users, {
        fields: [notificationSendLogs.creatorId],
        references: [users.id],
    }),
    organization: one(organizations, {
        fields: [notificationSendLogs.organizationId],
        references: [organizations.id],
    }),
}));
