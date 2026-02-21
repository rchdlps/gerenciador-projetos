# Pusher to Socket.IO Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Pusher (hosted SaaS) with self-hosted Socket.IO for real-time notifications, eliminating external dependency while keeping the same notification behavior.

**Architecture:** A custom Node.js entry point wraps Astro's compiled handler and attaches a Socket.IO server to the same HTTP server. Auth reuses `getCachedSession()` via cookie extraction from the WebSocket handshake. The `pushNotification()` function keeps the same signature, so callers only change their import path.

**Tech Stack:** Socket.IO (`socket.io` + `socket.io-client`), Astro Node adapter (standalone), better-auth session cookies, React hooks

---

### Task 1: Install Socket.IO dependencies and remove Pusher

**Files:**
- Modify: `package.json`

**Step 1: Install Socket.IO packages**

Run:
```bash
npm install socket.io socket.io-client
```

**Step 2: Remove Pusher packages**

Run:
```bash
npm uninstall pusher pusher-js
```

**Step 3: Verify package.json**

Run:
```bash
grep -E "socket.io|pusher" package.json
```

Expected: `socket.io` and `socket.io-client` present, no `pusher` or `pusher-js`.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap pusher for socket.io dependencies"
```

---

### Task 2: Create Socket.IO server module

**Files:**
- Create: `src/lib/socket-server.ts`

**Step 1: Create the server module**

This file replaces `src/lib/pusher.ts`. It exports `attachSocketIO()` (for the custom entry point) and `pushNotification()` (same signature as before).

```typescript
import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { getCachedSession } from "@/server/middleware/auth";

export type NotificationPayload = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
};

let io: Server | null = null;

/**
 * Attach Socket.IO to an existing HTTP server.
 * Called once at startup from the custom entry point.
 */
export function attachSocketIO(httpServer: HttpServer) {
    io = new Server(httpServer, {
        path: "/socket.io",
        cors: {
            origin: process.env.PUBLIC_URL || "http://localhost:4321",
            credentials: true,
        },
        // Increase ping interval for Railway (which may have aggressive idle timeouts)
        pingInterval: 25_000,
        pingTimeout: 20_000,
    });

    // Auth middleware: validate session cookie on connection
    io.use(async (socket: Socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) {
                return next(new Error("No session cookie"));
            }

            const headers = new Headers();
            headers.set("cookie", cookieHeader);

            const session = await getCachedSession(headers);
            if (!session) {
                return next(new Error("Invalid session"));
            }

            socket.data.userId = session.user.id;
            next();
        } catch (err) {
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket: Socket) => {
        const userId = socket.data.userId;
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        // Join user-specific room
        socket.join(`user:${userId}`);

        socket.on("disconnect", () => {
            // Cleanup happens automatically when socket leaves all rooms
        });
    });

    console.log("[Socket.IO] Server attached and ready");
}

/**
 * Push a notification to a specific user's room.
 * Same signature as the old Pusher pushNotification() for drop-in replacement.
 */
export async function pushNotification(userId: string, payload: NotificationPayload) {
    if (!io) {
        console.log("--- MOCK SOCKET NOTIFICATION ---");
        console.log(`User: ${userId}`);
        console.log(`Payload:`, JSON.stringify(payload, null, 2));
        console.log("--------------------------------");
        return { success: true };
    }

    try {
        io.to(`user:${userId}`).emit("notification", payload);
        return { success: true };
    } catch (error) {
        console.error("Failed to push notification via Socket.IO:", error);
        return { success: false, error };
    }
}

/** Get the Socket.IO server instance (for testing or advanced use) */
export function getIO(): Server | null {
    return io;
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`

Note: This may show an error about `@/server/middleware/auth` import — that's expected since Astro's path aliases may not resolve for a file that will be used in the custom entry point. We'll handle this in Task 4. For now, the type structure should be correct.

**Step 3: Commit**

```bash
git add src/lib/socket-server.ts
git commit -m "feat: add Socket.IO server module with auth middleware"
```

---

### Task 3: Create the `useSocket` client hook

**Files:**
- Create: `src/hooks/useSocket.ts`

**Step 1: Create the hook**

This replaces `src/hooks/usePusher.ts` with the same interface.

```typescript
import { useEffect, useRef, useState } from "react";

export type SocketNotification = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
};

type UseSocketOptions = {
    userId: string;
    onNotification?: (notification: SocketNotification) => void;
    onReconnect?: () => void;
};

/**
 * React hook for subscribing to real-time Socket.IO notifications.
 * Drop-in replacement for usePusher with the same interface.
 */
export function useSocket({ userId, onNotification, onReconnect }: UseSocketOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const onNotificationRef = useRef(onNotification);
    const onReconnectRef = useRef(onReconnect);

    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);

    useEffect(() => {
        onReconnectRef.current = onReconnect;
    }, [onReconnect]);

    useEffect(() => {
        let socket: any = null;

        const initSocket = async () => {
            try {
                const { io } = await import("socket.io-client");

                socket = io({
                    path: "/socket.io",
                    withCredentials: true,
                    // Socket.IO handles reconnection automatically
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 1_000,
                    reconnectionDelayMax: 30_000,
                });

                socket.on("connect", () => {
                    setIsConnected(true);
                    setError(null);
                });

                socket.on("disconnect", () => {
                    setIsConnected(false);
                });

                socket.io.on("reconnect", () => {
                    setIsConnected(true);
                    onReconnectRef.current?.();
                });

                socket.on("connect_error", (err: Error) => {
                    setError(err);
                    setIsConnected(false);
                });

                socket.on("notification", (data: SocketNotification) => {
                    onNotificationRef.current?.(data);
                });
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Failed to initialize Socket.IO"));
            }
        };

        initSocket();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [userId]);

    return { isConnected, error };
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "useSocket\|socket" | head -10`
Expected: No errors in useSocket.ts

**Step 3: Commit**

```bash
git add src/hooks/useSocket.ts
git commit -m "feat: add useSocket hook as drop-in replacement for usePusher"
```

---

### Task 4: Create the custom server entry point

**Files:**
- Create: `server.ts` (project root)

**Step 1: Create the custom entry**

This wraps Astro's compiled handler and attaches Socket.IO. Since Astro's Node standalone adapter creates and starts the server internally, we need to import the handler and create our own server.

First, check how the Astro Node adapter exports its handler. The standalone entry at `dist/server/entry.mjs` creates its own server and calls `.listen()`. We need to use the middleware mode instead.

**Important:** The Astro Node adapter in standalone mode doesn't easily export just the handler. The recommended approach is:

1. Build Astro normally (it generates `dist/server/entry.mjs`)
2. Our custom entry creates an `http.Server`, attaches Socket.IO, then imports and calls Astro's handler

Create `server.ts` at project root:

```typescript
import { createServer } from "node:http";
import { attachSocketIO } from "./src/lib/socket-server.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "3000", 10);

async function start() {
    // Import the Astro standalone handler
    // The Node adapter exports a 'handler' function from the built entry
    const { handler } = await import("./dist/server/entry.mjs");

    // Create our own HTTP server with the Astro handler
    const httpServer = createServer(handler);

    // Attach Socket.IO
    attachSocketIO(httpServer);

    httpServer.listen(PORT, HOST, () => {
        console.log(`Server running on http://${HOST}:${PORT}`);
    });
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
```

**Step 2: Verify Astro standalone handler export**

We need to check what the Astro Node adapter actually exports. Run:

```bash
npm run build && head -30 dist/server/entry.mjs
```

Look for the exported `handler` function. The Astro Node standalone adapter creates the server internally, so we may need to adapt our approach. If the entry doesn't export `handler` directly, we'll need to use the `@astrojs/node` adapter in `middleware` mode instead of `standalone`.

**If standalone doesn't export handler:** Change `astro.config.mjs`:
```javascript
adapter: node({ mode: 'middleware' })
```

Then the built entry exports a `handler` function we can use directly.

**Step 3: Update `astro.config.mjs` if needed**

If the adapter mode needs to change to `middleware`:

In `astro.config.mjs`, line 30, change:
```javascript
adapter: node({ mode: 'middleware' })
```

**Step 4: Add a build script for the custom entry**

The custom entry `server.ts` needs to be compiled alongside the Astro build. Add to `package.json` scripts:

```json
"build:server": "npx esbuild server.ts --bundle --platform=node --format=esm --outfile=dist/server.mjs --external:./dist/* --external:socket.io --external:@/*",
"build": "astro build && npm run build:server"
```

Alternatively, keep `server.ts` simple enough to run directly with Node.js (using dynamic imports only), avoiding the need for a separate build step. This is the simpler approach — write the entry as `server.mjs` (plain ESM) so Node.js runs it directly:

Create `server.mjs` at project root:

```javascript
import { createServer } from "node:http";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "3000", 10);

async function start() {
    // Import the Socket.IO server module (compiled into dist by Astro's build)
    // We need the attachSocketIO and the Astro handler
    const astroEntry = await import("./dist/server/entry.mjs");
    const handler = astroEntry.handler || astroEntry.default;

    const httpServer = createServer(handler);

    // Dynamically import socket.io
    const { Server } = await import("socket.io");

    const io = new Server(httpServer, {
        path: "/socket.io",
        cors: {
            origin: process.env.PUBLIC_URL || "http://localhost:4321",
            credentials: true,
        },
        pingInterval: 25_000,
        pingTimeout: 20_000,
    });

    // Store io globally so the notification module can access it
    globalThis.__socketIO = io;

    // Auth middleware
    io.use(async (socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) return next(new Error("No session cookie"));

            // Dynamic import of auth module (built by Astro)
            const { getCachedSession } = await import("./dist/server/middleware/auth.js");
            const headers = new Headers();
            headers.set("cookie", cookieHeader);

            const session = await getCachedSession(headers);
            if (!session) return next(new Error("Invalid session"));

            socket.data.userId = session.user.id;
            next();
        } catch (err) {
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        if (!userId) { socket.disconnect(true); return; }
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
```

**Note:** The above approach uses `globalThis.__socketIO` so that the notification module (inside Astro's compiled code) can access the Socket.IO instance. This is the simplest way to bridge the custom entry point with Astro's server-side code.

**Step 5: Test locally**

Run:
```bash
npm run build
node server.mjs
```

Expected: Server starts on port 3000, logs `[Socket.IO] Ready`.

**Step 6: Commit**

```bash
git add server.mjs astro.config.mjs
git commit -m "feat: add custom server entry point with Socket.IO"
```

---

### Task 5: Update `pushNotification` to use Socket.IO

**Files:**
- Modify: `src/lib/pusher.ts` → rename/replace with Socket.IO logic

**Step 1: Replace `src/lib/pusher.ts` with Socket.IO-based notification push**

Since the Socket.IO instance lives in `globalThis.__socketIO` (set by the custom entry point), the notification module reads it from there.

Replace the contents of `src/lib/pusher.ts` (keep the file path for now to minimize import changes, we'll rename in cleanup):

```typescript
import type { Server } from "socket.io";

export type NotificationPayload = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
};

// Alias for backward compatibility with existing imports
export type PusherNotificationPayload = NotificationPayload;

function getIO(): Server | null {
    return (globalThis as any).__socketIO || null;
}

/**
 * Push a notification to a specific user via Socket.IO.
 * Same signature as the old Pusher version — drop-in replacement.
 */
export async function pushNotification(userId: string, payload: NotificationPayload) {
    const io = getIO();

    if (!io) {
        console.log("--- MOCK SOCKET NOTIFICATION ---");
        console.log(`User: ${userId}`);
        console.log(`Payload:`, JSON.stringify(payload, null, 2));
        console.log("--------------------------------");
        return { success: true };
    }

    try {
        io.to(`user:${userId}`).emit("notification", payload);
        return { success: true };
    } catch (error) {
        console.error("Failed to push notification via Socket.IO:", error);
        return { success: false, error };
    }
}
```

**Step 2: Verify imports still work**

Since we kept the file at `src/lib/pusher.ts`, existing imports in `src/lib/notification.ts` (line 12) and `src/lib/inngest/functions/notify.ts` (line 8) still resolve. No import changes needed yet.

**Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/lib/pusher.ts
git commit -m "feat: replace Pusher with Socket.IO in pushNotification"
```

---

### Task 6: Update NotificationBell to use useSocket

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx`

**Step 1: Change the import**

In `NotificationBell.tsx`, line 14, change:

```typescript
// OLD
import { usePusher, type PusherNotification } from "@/hooks/usePusher";

// NEW
import { useSocket, type SocketNotification } from "@/hooks/useSocket";
```

**Step 2: Update the type reference**

Line 89, change `PusherNotification` to `SocketNotification`:

```typescript
// OLD
const handleNewNotification = useCallback((notification: PusherNotification) => {

// NEW
const handleNewNotification = useCallback((notification: SocketNotification) => {
```

**Step 3: Update the hook call**

Line 100, change `usePusher` to `useSocket`:

```typescript
// OLD
usePusher({ userId, onNotification: handleNewNotification, onReconnect: handleReconnect });

// NEW
useSocket({ userId, onNotification: handleNewNotification, onReconnect: handleReconnect });
```

**Step 4: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "NotificationBell" | head -5`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/notifications/NotificationBell.tsx
git commit -m "feat: switch NotificationBell from usePusher to useSocket"
```

---

### Task 7: Remove Pusher auth route and clean up app router

**Files:**
- Delete: `src/server/routes/pusher-auth.ts`
- Modify: `src/server/app.ts`

**Step 1: Remove the Pusher auth route import and registration from `src/server/app.ts`**

Remove line 23:
```typescript
import pusherAuthRouter from './routes/pusher-auth'
```

Remove line 50:
```typescript
    .route('/pusher/auth', pusherAuthRouter)
```

**Step 2: Delete the Pusher auth route file**

Delete `src/server/routes/pusher-auth.ts`.

**Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors about missing pusher-auth

**Step 4: Commit**

```bash
git rm src/server/routes/pusher-auth.ts
git add src/server/app.ts
git commit -m "chore: remove Pusher auth route"
```

---

### Task 8: Rename and clean up files

**Files:**
- Rename: `src/lib/pusher.ts` → `src/lib/realtime.ts`
- Delete: `src/hooks/usePusher.ts`
- Modify: `src/lib/notification.ts` (update import)
- Modify: `src/lib/inngest/functions/notify.ts` (update import)
- Modify: `src/server/routes/notifications.ts` (update import in dev test route)

**Step 1: Rename `src/lib/pusher.ts` to `src/lib/realtime.ts`**

```bash
git mv src/lib/pusher.ts src/lib/realtime.ts
```

**Step 2: Update import in `src/lib/notification.ts`**

Line 12, change:
```typescript
// OLD
import { pushNotification } from "./pusher";

// NEW
import { pushNotification } from "./realtime";
```

**Step 3: Update import in `src/lib/inngest/functions/notify.ts`**

Line 8, change:
```typescript
// OLD
import { pushNotification } from "@/lib/pusher";

// NEW
import { pushNotification } from "@/lib/realtime";
```

**Step 4: Update import in `src/server/routes/notifications.ts`**

Line 157 (dev test route), change:
```typescript
// OLD
const { pushNotification } = await import("@/lib/pusher");

// NEW
const { pushNotification } = await import("@/lib/realtime");
```

**Step 5: Delete the old usePusher hook**

```bash
git rm src/hooks/usePusher.ts
```

**Step 6: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 7: Verify no remaining Pusher references in source code**

Run:
```bash
grep -rn "pusher" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

Expected: No matches (or only comments/docs).

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rename pusher.ts to realtime.ts, remove usePusher hook"
```

---

### Task 9: Update Dockerfile and environment config

**Files:**
- Modify: `Dockerfile`
- Modify: `.env.example`

**Step 1: Update Dockerfile CMD**

In `Dockerfile`, line 65, change:
```dockerfile
# OLD
CMD ["node", "dist/server/entry.mjs"]

# NEW
CMD ["node", "server.mjs"]
```

Also remove the Pusher build args (lines 26-27, 32-33):

Remove:
```dockerfile
ARG PUBLIC_PUSHER_KEY
ARG PUBLIC_PUSHER_CLUSTER
ENV PUBLIC_PUSHER_KEY=$PUBLIC_PUSHER_KEY
ENV PUBLIC_PUSHER_CLUSTER=$PUBLIC_PUSHER_CLUSTER
```

Also add `COPY server.mjs ./` in the runtime stage (after `COPY --from=build /app/dist ./dist`):

```dockerfile
COPY --from=build /app/dist ./dist
COPY server.mjs ./
```

**Step 2: Update `.env.example`**

Remove the Pusher variables (lines 36-44):

Remove:
```
# Pusher (Real-time notifications)
# Get from: https://dashboard.pusher.com
PUSHER_APP_ID=your-pusher-app-id
PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret
PUSHER_CLUSTER=us2

# Pusher (Client-side — prefixed with PUBLIC_ for Astro)
PUBLIC_PUSHER_KEY=your-pusher-key
PUBLIC_PUSHER_CLUSTER=us2
```

**Step 3: Commit**

```bash
git add Dockerfile .env.example
git commit -m "chore: update Dockerfile for Socket.IO, remove Pusher env vars"
```

---

### Task 10: Update CLAUDE.md and design docs

**Files:**
- Modify: `CLAUDE.md` (update references to Pusher → Socket.IO)

**Step 1: Update CLAUDE.md**

Search for all Pusher references in CLAUDE.md and update:

- Notification System section: Replace Pusher references with Socket.IO
- Environment Variables section: Remove PUSHER vars, note Socket.IO needs no extra env vars
- Remove `PUBLIC_PUSHER_KEY` / `PUBLIC_PUSHER_CLUSTER` from the env vars list

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Pusher to Socket.IO migration"
```

---

### Task 11: Integration testing and final verification

**Step 1: Build the project**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 2: Start with custom entry**

Run:
```bash
node server.mjs
```

Expected: Server starts, logs `[Server] Running on http://0.0.0.0:3000` and `[Socket.IO] Ready`.

**Step 3: Verify no Pusher references remain**

Run:
```bash
grep -rn "pusher" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

Expected: No matches (except possibly comments in design docs).

Run:
```bash
grep -rn "PUSHER" .env* Dockerfile
```

Expected: No matches.

**Step 4: Run test suite**

Run:
```bash
npm run test:run
```

Expected: Same pass/fail as before migration (pre-existing failures only).

**Step 5: Manual testing (dev mode)**

Run:
```bash
npm run dev
```

Manual verification:
1. Log in, verify notification bell renders with correct count
2. Check browser console — no Pusher errors, Socket.IO connection established
3. Send a test notification (if dev test endpoint still works)
4. Verify it appears in real-time

**Step 6: Commit any fixes**

If any issues found, fix and commit.

---

### Task 12: Clean up the Socket.IO server module

**Files:**
- Delete: `src/lib/socket-server.ts` (created in Task 2 but superseded by `server.mjs` approach)

Since we ended up putting the Socket.IO setup directly in `server.mjs` (to avoid import path issues between Astro's build output and our custom code), the `src/lib/socket-server.ts` file from Task 2 is unused. Delete it if it wasn't needed, or keep it if `server.mjs` imports from it.

**Step 1: Check if `src/lib/socket-server.ts` is imported anywhere**

Run:
```bash
grep -rn "socket-server" src/ server.mjs
```

If no imports, delete it:
```bash
git rm src/lib/socket-server.ts
git commit -m "chore: remove unused socket-server module"
```

If it IS imported, keep it and skip this task.
