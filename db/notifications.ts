import { pgTable, text, timestamp, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
    "activity",  // Comments, task updates, assignments
    "system",    // Platform announcements, maintenance
]);

// Main notifications table
export const notifications = pgTable("notifications", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    data: text("data"), // JSON payload for links, metadata (e.g., projectId, taskId)
    isRead: boolean("is_read").notNull().default(false),
    isEmailSent: boolean("is_email_sent").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
    userIdIdx: index('notification_user_idx').on(t.userId),
    userReadIdx: index('notification_user_read_idx').on(t.userId, t.isRead),
    createdAtIdx: index('notification_created_idx').on(t.createdAt),
}));

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));
