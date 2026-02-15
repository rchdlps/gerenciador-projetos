# Railway Deployment Support Design

**Date:** 2026-02-15
**Status:** Approved
**Scope:** Add Railway as an alternative deployment target alongside Vercel

## Context

The project currently deploys exclusively to Vercel using `@astrojs/vercel` (serverless functions). We want to support Railway as an alternative deployment target, which runs a long-running Node.js server instead of serverless functions. Both targets must coexist — Vercel remains the default.

## Approach: Environment-Based Adapter Selection

Use `DEPLOY_TARGET` env var at build time to select the Astro adapter:
- `DEPLOY_TARGET=railway` → `@astrojs/node` (standalone mode)
- Default → `@astrojs/vercel` (current behavior)

## Changes Required

### 1. Install `@astrojs/node`

New dependency: `@astrojs/node` — the official Astro adapter for standalone Node.js servers.

### 2. Modify `astro.config.mjs`

Conditional adapter based on `DEPLOY_TARGET`:

```javascript
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

const isRailway = process.env.DEPLOY_TARGET === 'railway';

export default defineConfig({
  adapter: isRailway
    ? node({ mode: 'standalone' })
    : vercel({ maxDuration: 60 }),
  // ... rest unchanged
})
```

### 3. Create `Dockerfile`

Multi-stage build:
- Stage 1 (build): `node:24-slim`, install deps, `DEPLOY_TARGET=railway`, `astro build`
- Stage 2 (runtime): Copy `dist/`, `node_modules`, run `node dist/server/entry.mjs`

Railway auto-detects and uses the Dockerfile.

### 4. Create `.dockerignore`

Exclude `node_modules`, `.git`, `dist`, `.env`, test files from Docker context.

## No Changes Needed

- **Database** (`postgres-js`) — standard TCP, works anywhere
- **Pusher** — external service
- **Inngest** — set `INNGEST_SERVE_HOST` to Railway URL
- **S3/Resend/Sentry** — external services
- **`argon2`** — native module compiles in Docker Linux

## Environment Variables (Railway)

Same as Vercel, set via Railway dashboard. URL-dependent vars need the Railway domain:
- `BETTER_AUTH_URL` → `https://your-app.up.railway.app`
- `PUBLIC_URL` → `https://your-app.up.railway.app`
- `INNGEST_SERVE_HOST` → `https://your-app.up.railway.app`
- `PORT` — auto-set by Railway, `@astrojs/node` reads it automatically

## Differences from Vercel

| Item | Vercel | Railway |
|------|--------|---------|
| Adapter | `@astrojs/vercel` | `@astrojs/node` (standalone) |
| Runtime | Serverless functions | Long-running Node.js server |
| Build output | Vercel-specific | `dist/server/entry.mjs` |
| Port | Managed by Vercel | `PORT` env var (Railway sets this) |
| `maxDuration` | 60s limit | No limit |
| Connection pool | `max: 10` | Could increase for persistent server |
