# Railway Deployment Architecture

This document outlines the architecture for deploying the project on [Railway](https://railway.app), using its managed PostgreSQL service and long-running server capabilities.

## Overview

The application is deployed as a single long-running Node.js service that handles:
1.  **Web Request Serving**: Astro SSR (Server Side Rendering) pages and API routes.
2.  **Background Jobs**: Inngest functions processing within the same instance (or scalable separately).

## Services

### 1. Web Service (The App)
-   **Source**: GitHub Repository
-   **Build Command**: `npm run build`
-   **Start Command**: `npm run start` (Starts the Node.js SSR server)
-   **Port**: Railway automatically injects `PORT`. Astro is configured to listen on `0.0.0.0` or `HOST` env var.

### 2. Database (PostgreSQL)
-   **Service**: Railway Managed PostgreSQL
-   **Connection**:
    -   Uses the private networking `DATABASE_URL` for internal communication (faster, secure).
    -   Example: `postgresql://postgres:password@roundhouse.proxy.rlwy.net:TCP_PORT/railway`
    -   **Important**: Ensure the application service is linked to the Postgres service variables or manually set `DATABASE_URL`.

### 3. Background Jobs (Inngest)
-   **Service**: Inngest (External / Embedded)
-   **Mechanism**: The application exposes an API route `/api/inngest` which the Inngest Cloud or managing service calls.
-   **Durable Execution**: Inngest manages the state and retries of background jobs.
-   **Scaling**: Since the Inngest handler is just an API route, it scales horizontally with the Web Service.

## Environment Variables

These variables must be set in the Railway project settings:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Connection string for Railway Postgres. |
| `BETTER_AUTH_SECRET` | A secure random string for authentication encryption. |
| `BETTER_AUTH_URL` | The public URL of your deployed app (e.g., `https://my-project.up.railway.app`). |
| `INNGEST_EVENT_KEY` | Production Event Key from Inngest Cloud. |
| `INNGEST_SIGNING_KEY` | Signing Key from Inngest Cloud to verify webhooks. |
| `HOST` | Set to `0.0.0.0` to expose the server to Railway's ingress. |
| `PORT` | (Optional) Railway sets this, usually `3000` or random. |
| `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `ENDPOINT`, `REGION` | Auto-injected by Railway when a Bucket is linked to the service. |

## Deployment Workflow

1.  **Push to GitHub**: Commits to the `main` branch trigger a deployment.
2.  **Build**: Railway installs dependencies (`npm ci`) and builds the Astro project.
3.  **Migration**: 
    -   **Recommended**: Add a "Pre-deploy" or "Start" script hook to run migrations.
    -   Command: `npx drizzle-kit migrate` (Ensure `drizzle.config.ts` is configured correctly for production).
4.  **Start**: The server starts and becomes healthy once the health check passes.

## Scaling

-   **Vertical**: Increase RAM/CPU in Railway service settings if the Node.js process runs out of memory.
-   **Horizontal**: Increase replica count. Note that for WebSocket or stateful features, you might need a Sticky Session or Pub/Sub (Redis) adapter, though for standard REST/SSR this works out of the box.
