import { createServer } from "node:http";
import { Server } from "socket.io";

// Prevent Astro from auto-starting its own server
process.env.ASTRO_NODE_AUTOSTART = "disabled";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "4321", 10);

async function start() {
    // Import the Astro standalone handler (auto-start is disabled)
    const { handler } = await import("./dist/server/entry.mjs");

    // Create HTTP server with Astro's handler
    const httpServer = createServer(handler);

    // Attach Socket.IO
    const io = new Server(httpServer, {
        path: "/socket.io",
        cors: {
            origin: process.env.PUBLIC_URL || "http://localhost:4321",
            credentials: true,
        },
        pingInterval: 25_000,
        pingTimeout: 20_000,
    });

    // Store globally so the notification module can access it
    globalThis.__socketIO = io;

    // Auth middleware: validate session cookie on connection
    io.use(async (socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) {
                return next(new Error("No session cookie"));
            }

            // Extract session token from cookie
            const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
            if (!match) {
                return next(new Error("No session token"));
            }

            // Simple session validation: make an internal fetch to the auth API
            // This reuses better-auth's own session validation
            const sessionRes = await fetch(`http://localhost:${PORT}/api/auth/get-session`, {
                headers: { cookie: cookieHeader },
            });

            if (!sessionRes.ok) {
                return next(new Error("Invalid session"));
            }

            const session = await sessionRes.json();
            if (!session?.user?.id) {
                return next(new Error("Invalid session"));
            }

            socket.data.userId = session.user.id;
            next();
        } catch (err) {
            console.error("[Socket.IO Auth] Error:", err);
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        socket.join(`user:${userId}`);
    });

    httpServer.listen(PORT, HOST, () => {
        console.log(`[Server] Running on http://${HOST}:${PORT}`);
        console.log(`[Socket.IO] Ready`);
    });
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
