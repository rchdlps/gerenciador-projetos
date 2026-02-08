# Environment Strategy: Neon Branching and Deployment

## Context
We are using Neon (serverless Postgres) with Vercel for deployment. As development progresses, we need a strategy to promote changes from the `dev` environment to `production`.

Since Neon supports instant branching (Copy-on-Write), we have unique options for managing environments compared to traditional databases.

## Strategies

### 1. The "Clone & Promote" (Blue/Green Deployment)
**Best for:** Early development, major version upgrades, or when you want the *exact* data state from Dev in Prod.

**Process:**
1.  Treat the current `dev` branch as the source of truth.
2.  Create a new `prod-v2` branch *from* `dev`.
3.  Update Vercel Environment Variables (`DATABASE_URL`) to point to `prod-v2`.
4.  Redeploy.

**Pros:**
*   **Immutable History:** Creates a snapshot of the state.
*   **Safety:** Original branches remain untouched.
*   **Verified State:** The exact data/schema tested in dev becomes prod.

**Cons:**
*   **Connection Change:** Requires app redeployment.
*   **Cold Start:** New branch has empty cache.

### 2. The "Pointer Swap" (Environment Variable Change)
**Best for:** Rapid prototyping where `dev` *becomes* `prod`.

**Process:**
1.  Simply point the Production `DATABASE_URL` to the *existing* `dev` branch.
2.  Rename the branch in Neon console (optional/cosmetic).

**Pros:**
*   **Instant.** No data copy time.

**Cons:**
*   **Compute Mismatch:** Dev branches may have lower compute limits (`min_cu`) than needed for Prod.
*   **Confusing History:** "Dev" becomes "Prod", losing the distinction.

### 3. The "Standard Migration" (Schema Only)
**Best for:** **Live Applications with Real Users.**

**Process:**
1.  Do NOT swap databases.
2.  Apply only *schema changes* to the existing Production database using migrations.
    ```bash
    drizzle-kit migrate
    ```

**Pros:**
*   **Data Integrity:** Preserves user data created in Production.
*   **Stability:** Keeps existing connection pooling and compute settings.

**Cons:**
*   **Complexity:** Requires managing migration files and potential data migrations.

## Recommendation

*   **Current Phase:** Use **Strategy 1 (Clone & Promote)**.
    *   Since we are likely in active development/beta, creating a fresh "clean" production branch from our stable dev state ensures we launch with a known good dataset.
*   **Future (Post-Launch):** Switch to **Strategy 3 (Standard Migration)**.
    *   Once users are generating data, we cannot simply "swap" the database without losing their work.
