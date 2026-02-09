import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("@/lib/db", () => ({
    db: {
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([]),
                    }),
                }),
            }),
        }),
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
            }),
        }),
        delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
        }),
    },
}));

// Mock Inngest
vi.mock("@/lib/inngest/client", () => ({
    inngest: {
        send: vi.fn().mockResolvedValue({ ids: ["test-id"] }),
    },
}));

// Import after mocking
import {
    emitNotification,
    emitSystemAnnouncement,
    storeNotification,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from "../notification";
import { inngest } from "../inngest/client";
import { db } from "../db";

describe("Notification Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("emitNotification", () => {
        it("should send activity notification to Inngest queue", async () => {
            await emitNotification({
                userId: "user-123",
                type: "activity",
                title: "New Comment",
                message: "Someone commented on your task",
                data: { taskId: "task-456" },
            });

            expect(inngest.send).toHaveBeenCalledWith({
                name: "notification/activity",
                data: {
                    userId: "user-123",
                    title: "New Comment",
                    message: "Someone commented on your task",
                    data: { taskId: "task-456" },
                },
            });
        });
    });

    describe("emitSystemAnnouncement", () => {
        it("should send system announcement to Inngest queue", async () => {
            await emitSystemAnnouncement(
                "System Maintenance",
                "Scheduled maintenance tonight",
                { urgent: true }
            );

            expect(inngest.send).toHaveBeenCalledWith({
                name: "notification/system",
                data: {
                    title: "System Maintenance",
                    message: "Scheduled maintenance tonight",
                    data: { urgent: true },
                },
            });
        });
    });

    describe("storeNotification", () => {
        it("should insert notification into database and return ID", async () => {
            const result = await storeNotification({
                userId: "user-123",
                type: "activity",
                title: "Test Title",
                message: "Test Message",
            });

            expect(result).toBeDefined();
            expect(typeof result).toBe("string");
            expect(db.insert).toHaveBeenCalled();
        });
    });

    describe("getUnreadCount", () => {
        it("should query database for unread count", async () => {
            const mockCount = [{ count: 5 }];
            const selectMock = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockCount),
                }),
            });
            (db.select as any).mockReturnValue(selectMock());

            const count = await getUnreadCount("user-123");

            expect(db.select).toHaveBeenCalled();
        });
    });

    describe("markAsRead", () => {
        it("should update notification read status", async () => {
            await markAsRead("notif-123", "user-123");

            expect(db.update).toHaveBeenCalled();
        });
    });

    describe("markAllAsRead", () => {
        it("should update all unread notifications for user", async () => {
            await markAllAsRead("user-123");

            expect(db.update).toHaveBeenCalled();
        });
    });
});
