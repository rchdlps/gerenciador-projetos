import type { Plugin, ViteDevServer } from "vite";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Vite plugin that attaches Socket.IO to the dev server.
 * In production, server.mjs handles this instead.
 */
export function socketIODevPlugin(): Plugin {
    return {
        name: "socket-io-dev",
        configureServer(server: ViteDevServer) {
            if (!server.httpServer) return;

            // Use require() to bypass Vite's module resolution
            const { Server } = require("socket.io");

            const io = new Server(server.httpServer, {
                path: "/socket.io",
                cors: {
                    origin: "http://localhost:4321",
                    credentials: true,
                },
            });

            (globalThis as any).__socketIO = io;

            // Auth middleware: validate session cookie
            io.use(async (socket: any, next: (err?: Error) => void) => {
                try {
                    const cookieHeader = socket.handshake.headers.cookie;
                    if (!cookieHeader) return next(new Error("No session cookie"));

                    // Use Vite's ssrLoadModule to import the auth module
                    const authMod = await server.ssrLoadModule("/src/server/middleware/auth.ts");
                    const { getCachedSession } = authMod;

                    const headers = new Headers();
                    headers.set("cookie", cookieHeader);

                    const session = await getCachedSession(headers);
                    if (!session) return next(new Error("Invalid session"));

                    socket.data.userId = session.user.id;
                    next();
                } catch (err) {
                    console.error("[Socket.IO Dev] Auth error:", err);
                    next(new Error("Authentication failed"));
                }
            });

            io.on("connection", (socket: any) => {
                const userId = socket.data.userId;
                if (!userId) {
                    socket.disconnect(true);
                    return;
                }
                socket.join(`user:${userId}`);
            });

            console.log("[Socket.IO Dev] Attached to Vite dev server");
        },
    };
}
