# Railway Deployment Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Railway as an alternative deployment target alongside Vercel, using environment-based adapter selection and a multi-stage Dockerfile.

**Architecture:** A `DEPLOY_TARGET` env var selects between `@astrojs/vercel` (default, serverless) and `@astrojs/node` (standalone, for Railway). A multi-stage Dockerfile handles the Railway build and runtime. No application code changes needed — only build/deploy config.

**Tech Stack:** Astro, `@astrojs/node`, Docker, Railway

---

## Task 1: Install `@astrojs/node` and Update `astro.config.mjs`

**Files:**
- Modify: `astro.config.mjs` (lines 7, 27-29)
- Modify: `package.json` (new dependency added by npm)

**Step 1: Install the Node adapter**

Run:
```bash
npm install @astrojs/node
```

Expected: `@astrojs/node` added to `package.json` dependencies, `package-lock.json` updated.

**Step 2: Update `astro.config.mjs` for conditional adapter**

Replace the entire file content with:

```javascript
// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

import sentry from "@sentry/astro";

const isRailway = process.env.DEPLOY_TARGET === 'railway';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    sentry({
      project: "javascript-astro",
      org: "dexatec",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: isRailway
    ? node({ mode: 'standalone' })
    : vercel({ maxDuration: 60 }),

  image: {
    domains: ['hel1.your-objectstorage.com']
  }
});
```

**Step 3: Verify default build still works (Vercel mode)**

Run:
```bash
npm run build
```

Expected: Build succeeds. Since `DEPLOY_TARGET` is not set, it uses the Vercel adapter (default behavior, unchanged).

**Step 4: Verify Railway build works**

Run:
```bash
DEPLOY_TARGET=railway npm run build
```

Expected: Build succeeds. Output includes `dist/server/entry.mjs`. The terminal should show Astro using the Node adapter.

**Step 5: Commit**

```bash
git add astro.config.mjs package.json package-lock.json
git commit -m "feat: add @astrojs/node adapter with DEPLOY_TARGET env-based selection for Railway support"
```

---

## Task 2: Create `.dockerignore`

**Files:**
- Create: `.dockerignore`

**Step 1: Create the file**

Create `.dockerignore` at the project root:

```
node_modules/
dist/
.astro/
.git/
.gitignore
.env
.env.*
.vercel/
.vscode/
.idea/

# Test files
coverage/
.nyc_output/
playwright-report/
test-results/
playwright/.cache/
e2e/
src/**/__tests__/
src/test/
vitest.config.*
playwright.config.*

# Docs and plans
docs/
*.md
!README.md

# Misc
.DS_Store
*.log
aws/
```

**Step 2: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore for Railway Docker builds"
```

---

## Task 3: Create `Dockerfile`

**Files:**
- Create: `Dockerfile`

**Step 1: Create the Dockerfile**

Create `Dockerfile` at the project root:

```dockerfile
# ── Stage 1: Build ──────────────────────────────────────────
FROM node:24-slim AS build

WORKDIR /app

# Install build dependencies for native modules (argon2)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

RUN npm ci

# Copy source code
COPY . .

# Build with Railway adapter
ENV DEPLOY_TARGET=railway

# Capture build arguments for client-side env vars
ARG PUBLIC_PUSHER_KEY
ARG PUBLIC_PUSHER_CLUSTER
ENV PUBLIC_PUSHER_KEY=$PUBLIC_PUSHER_KEY
ENV PUBLIC_PUSHER_CLUSTER=$PUBLIC_PUSHER_CLUSTER

RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────
FROM node:24-slim AS runtime

WORKDIR /app

# Install runtime dependencies for native modules (argon2)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built output from build stage
COPY --from=build /app/dist ./dist

# Railway sets PORT automatically; @astrojs/node reads HOST and PORT
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Start the standalone Node.js server
CMD ["node", "dist/server/entry.mjs"]
```

**Step 2: Test Docker build locally (optional)**

Run:
```bash
docker build -t gerenciador-projetos .
```

Expected: Multi-stage build completes successfully. Image is created.

To test the image runs (requires env vars):
```bash
docker run --rm -p 3000:3000 --env-file .env -e DEPLOY_TARGET=railway gerenciador-projetos
```

Expected: Server starts on port 3000.

**Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add multi-stage Dockerfile for Railway deployment"
```

---

## Task 4: Update `.env.example` with Railway Notes

**Files:**
- Modify: `.env.example` (add comments for Railway)

**Step 1: Add Railway deployment notes**

At the bottom of `.env.example`, add:

```bash

# ── Railway Deployment ──────────────────────────────────────
# Set DEPLOY_TARGET=railway in Railway's build environment variables.
# Railway auto-sets PORT; @astrojs/node reads it automatically.
# Update these URLs to your Railway domain:
#   BETTER_AUTH_URL=https://your-app.up.railway.app
#   PUBLIC_URL=https://your-app.up.railway.app
#   INNGEST_SERVE_HOST=https://your-app.up.railway.app
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Railway deployment notes to .env.example"
```

---

## Summary

| Task | Files | What It Does |
|------|-------|-------------|
| 1 | `astro.config.mjs`, `package.json` | Conditional adapter: Vercel (default) or Node (Railway) |
| 2 | `.dockerignore` | Exclude unnecessary files from Docker build context |
| 3 | `Dockerfile` | Multi-stage Docker build for Railway |
| 4 | `.env.example` | Document Railway-specific env var notes |

## Railway Setup Checklist (Post-Implementation)

After deploying to Railway, set these env vars in the Railway dashboard:

- `DEPLOY_TARGET=railway`
- `DATABASE_URL=<your-postgres-connection-string>`
- `BETTER_AUTH_SECRET=<your-secret>`
- `BETTER_AUTH_URL=https://your-app.up.railway.app`
- `PUBLIC_URL=https://your-app.up.railway.app`
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`
- `RESEND_API_KEY`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_SERVE_HOST=https://your-app.up.railway.app`
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `PUBLIC_PUSHER_KEY`, `PUBLIC_PUSHER_CLUSTER`
- `SENTRY_AUTH_TOKEN`
