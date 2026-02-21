# Pusher to Socket.IO Migration Design

**Date:** 2026-02-21
**Status:** Approved

## Problem

The app uses Pusher (hosted SaaS) for real-time notifications. Now deployed on Railway with a persistent Node.js process, Pusher is an unnecessary external dependency adding cost and complexity. The notification use case is one-way (server → client) with user-specific channels.

## Solution

Replace Pusher with self-hosted Socket.IO attached to the existing Node.js HTTP server. Socket.IO provides built-in reconnection, heartbeat, fallback to HTTP long-polling, and room-based routing — all needed features with zero external service dependency.

## Architecture

### Custom Entry Point

A wrapper script creates the `http.Server`, attaches both Astro's handler and Socket.IO, then listens on `HOST:PORT`:

```
                    ┌─────────────────────────────┐
                    │     server.ts (custom)       │
                    │                              │
       HTTP ───────┤  http.createServer()          │
       requests    │    ├── Astro handler (SSR+API)│
                   │    └── Socket.IO (upgrade)    │
       WebSocket ──┤                              │
       connections │  io = new Server(httpServer)  │
                    └─────────────────────────────┘
```

This approach imports Astro's compiled handler as a black box (`handler(req, res)`), making it resilient to Astro version updates.

### Authentication

Socket.IO auth middleware extracts the session cookie from the handshake headers and validates it using `getCachedSession()` — the same cache used by API routes and SSR pages. On success, the socket joins room `user:{userId}`.

### Server-Side Emit

`pushNotification(userId, payload)` keeps the same function signature. Internally it changes from `pusher.trigger(channel, event, payload)` to `io.to('user:' + userId).emit('notification', payload)`. All callers (`notification.ts`, `notify.ts`) only change their import path.

### Client Hook

`useSocket` replaces `usePusher` with the same interface: `{ userId, onNotification?, onReconnect? }` → `{ isConnected, error }`. Uses `useRef` pattern for callbacks (already established). Socket.IO's built-in reconnection fires `onReconnect` automatically.

## Migration Map

| Current (Pusher) | New (Socket.IO) | Change |
|---|---|---|
| `src/lib/pusher.ts` | `src/lib/socket-server.ts` | Replace |
| `src/server/routes/pusher-auth.ts` | Delete | Remove (auth in handshake) |
| `src/server/app.ts` route registration | Remove `/pusher/auth` line | Remove |
| `src/hooks/usePusher.ts` | `src/hooks/useSocket.ts` | Replace |
| `NotificationBell.tsx` import | Change to `useSocket` | Minimal |
| `src/lib/notification.ts` import | Change import source | 1-line |
| `src/lib/inngest/functions/notify.ts` import | Change import source | 1-line |
| `.env.example` — 4 PUSHER vars | Remove | Config cleanup |
| `Dockerfile` CMD | Point to `server.mjs` | 1-line |
| `package.json` — `pusher` + `pusher-js` | `socket.io` + `socket.io-client` | Dep swap |

## What Stays the Same

- Database notification storage and queries
- Inngest background job handlers (only import path changes)
- NotificationBell UI (all JSX unchanged)
- Notification types/payload structure
- Reconnection + visibility refresh logic (works identically)
- `getCachedSession()` auth mechanism

## Multi-Instance Scaling (Future)

If the app needs multiple Railway instances later, add `@socket.io/redis-adapter` — a drop-in adapter that uses Redis pub/sub to sync events across instances. No architectural changes needed.

## Dependencies

- **Add:** `socket.io`, `socket.io-client`
- **Remove:** `pusher`, `pusher-js`
- **Remove env vars:** `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `PUBLIC_PUSHER_KEY`, `PUBLIC_PUSHER_CLUSTER`
