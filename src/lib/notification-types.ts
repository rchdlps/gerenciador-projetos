export type NotificationType = "activity" | "system";

export type NotificationData = {
    projectId?: string;
    taskId?: string;
    phaseId?: string;
    link?: string;
    priority?: "urgent" | "high" | "normal";
    [key: string]: unknown;
};

export type CreateNotificationInput = {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
};

export type NotificationFilter = {
    status?: "all" | "unread" | "read";
    type?: NotificationType | "all";
    search?: string;
    startDate?: Date;
    endDate?: Date;
};

// Also type for the notification object returned to frontend
export type Notification = {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    createdAt: string | Date;
    data?: NotificationData;
};
