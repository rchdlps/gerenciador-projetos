# Initials Avatar Generation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Every user gets a generated SVG avatar with their initials on a deterministic colored background, created at registration and available as a fallback.

**Architecture:** A pure `generateInitialsAvatar(name, userId)` function produces SVG markup with initials + hash-based background color. Generated on user creation via a better-auth `databaseHooks.user.create.after` hook, uploaded to S3, and stored as a proxy URL in `users.image`. The avatar proxy endpoint provides an on-the-fly fallback for existing users without avatars.

**Tech Stack:** SVG string templates (no dependencies), better-auth hooks, existing S3 storage + avatar proxy

---

### Task 1: Avatar Generator — Tests

**Files:**
- Create: `src/lib/__tests__/avatar-generator.test.ts`

**Step 1: Write the tests**

```typescript
import { describe, it, expect } from 'vitest'
import { generateInitialsAvatar, getInitials, getAvatarColor } from '../avatar-generator'

describe('avatar-generator', () => {
    describe('getInitials', () => {
        it('extracts first + last initials from full name', () => {
            expect(getInitials('João Silva')).toBe('JS')
        })

        it('extracts single initial from single name', () => {
            expect(getInitials('Admin')).toBe('A')
        })

        it('handles three-part names (first + last)', () => {
            expect(getInitials('Maria da Silva')).toBe('MS')
        })

        it('returns ? for empty string', () => {
            expect(getInitials('')).toBe('?')
        })

        it('returns ? for null/undefined', () => {
            expect(getInitials(null as any)).toBe('?')
            expect(getInitials(undefined as any)).toBe('?')
        })

        it('uppercases initials', () => {
            expect(getInitials('joão silva')).toBe('JS')
        })

        it('trims whitespace', () => {
            expect(getInitials('  Ana Costa  ')).toBe('AC')
        })
    })

    describe('getAvatarColor', () => {
        it('returns a hex color string', () => {
            const color = getAvatarColor('user-id-123')
            expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
        })

        it('is deterministic (same ID = same color)', () => {
            const a = getAvatarColor('user-abc')
            const b = getAvatarColor('user-abc')
            expect(a).toBe(b)
        })

        it('different IDs can produce different colors', () => {
            const a = getAvatarColor('user-1')
            const b = getAvatarColor('user-2')
            // Not guaranteed to differ, but with 16 colors very likely
            // Just verify both are valid colors
            expect(a).toMatch(/^#[0-9a-fA-F]{6}$/)
            expect(b).toMatch(/^#[0-9a-fA-F]{6}$/)
        })
    })

    describe('generateInitialsAvatar', () => {
        it('returns a valid SVG string', () => {
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg).toContain('<svg')
            expect(svg).toContain('</svg>')
            expect(svg).toContain('200') // viewBox dimension
        })

        it('contains the initials in the SVG', () => {
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg).toContain('>JS<')
        })

        it('contains the hash-based color', () => {
            const color = getAvatarColor('user-123')
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg).toContain(color)
        })

        it('uses ? for empty name', () => {
            const svg = generateInitialsAvatar('', 'user-123')
            expect(svg).toContain('>?<')
        })

        it('produces compact output (under 1KB)', () => {
            const svg = generateInitialsAvatar('João Silva', 'user-123')
            expect(svg.length).toBeLessThan(1024)
        })
    })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/avatar-generator.test.ts`
Expected: FAIL — module `../avatar-generator` not found

**Step 3: Commit**

```bash
git add src/lib/__tests__/avatar-generator.test.ts
git commit -m "test: add avatar generator tests"
```

---

### Task 2: Avatar Generator — Implementation

**Files:**
- Create: `src/lib/avatar-generator.ts`

**Step 1: Implement the avatar generator**

```typescript
/**
 * Generates SVG avatars with user initials on a deterministic colored background.
 * Pure functions — no I/O, no dependencies.
 */

// 16 curated colors with good contrast against white text
const AVATAR_COLORS = [
    '#E53935', // red
    '#D81B60', // pink
    '#8E24AA', // purple
    '#5E35B1', // deep purple
    '#3949AB', // indigo
    '#1E88E5', // blue
    '#039BE5', // light blue
    '#00ACC1', // cyan
    '#00897B', // teal
    '#43A047', // green
    '#7CB342', // light green
    '#C0CA33', // lime
    '#F4511E', // deep orange
    '#6D4C41', // brown
    '#546E7A', // blue grey
    '#757575', // grey
]

/** Simple string hash — deterministic, not cryptographic */
function hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash |= 0 // Convert to 32-bit integer
    }
    return Math.abs(hash)
}

/** Extract initials from a name: "João Silva" → "JS", "Admin" → "A", "" → "?" */
export function getInitials(name: string | null | undefined): string {
    if (!name || !name.trim()) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase()
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Get a deterministic color from the palette based on userId */
export function getAvatarColor(userId: string): string {
    return AVATAR_COLORS[hashString(userId) % AVATAR_COLORS.length]
}

/** Generate an SVG avatar with initials and a colored background circle */
export function generateInitialsAvatar(name: string, userId: string): string {
    const initials = getInitials(name)
    const color = getAvatarColor(userId)
    // Font size: smaller for 2-char initials, larger for 1-char
    const fontSize = initials.length > 1 ? 80 : 90

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<circle cx="100" cy="100" r="100" fill="${color}"/>
<text x="100" y="100" dy="0.35em" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="600">${initials}</text>
</svg>`
}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/avatar-generator.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/lib/avatar-generator.ts
git commit -m "feat: add SVG avatar generator with initials and hash-based colors"
```

---

### Task 3: Auth Hook — Generate Avatar on Registration

**Files:**
- Modify: `src/lib/auth.ts:70-83` (the `databaseHooks.user.create` section)

**Context:** The `databaseHooks.user.create` currently has a `before` hook that sets defaults. We need to add an `after` hook that generates the avatar and uploads it to S3.

**Step 1: Add the after hook**

Add an `after` callback inside the existing `databaseHooks.user.create` object (after the `before` hook at line 82):

```typescript
// Inside databaseHooks.user.create, after the existing `before` hook:
after: async (user) => {
    try {
        const { generateInitialsAvatar } = await import("./avatar-generator")
        const { storage } = await import("./storage")

        const svg = generateInitialsAvatar(user.name, user.id)
        const key = `avatars/${user.id}/initials.svg`
        const buffer = Buffer.from(svg, "utf-8")

        await storage.uploadFile(key, buffer, "image/svg+xml")

        const proxyUrl = `/api/storage/avatar/${user.id}?key=${encodeURIComponent(key)}`
        await db.update(schema.users).set({ image: proxyUrl }).where(eq(schema.users.id, user.id))

        console.log(`[Auth] Generated initials avatar for user ${user.id}`)
    } catch (err) {
        // Non-blocking — user creation should not fail if avatar generation fails
        console.error(`[Auth] Failed to generate initials avatar for user ${user.id}:`, err)
    }
}
```

**Important:** Use dynamic `import()` for `avatar-generator` and `storage` to avoid circular dependency issues in the auth module.

**Step 2: Verify the hook compiles**

Run: `npx tsc --noEmit src/lib/auth.ts 2>&1 | grep -v 'node_modules\|notify.ts\|projects.test.ts'`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: generate initials avatar on user registration"
```

---

### Task 4: Avatar Proxy Fallback — On-the-Fly Generation

**Files:**
- Modify: `src/pages/api/storage/avatar/[userId].ts`

**Context:** Currently the avatar proxy returns 404 when no `key` param is provided or when the S3 download fails. We need to add a fallback that generates an initials avatar on-the-fly for existing users without avatars.

**Step 1: Update the avatar proxy**

Replace the entire file content:

```typescript
import type { APIRoute } from "astro"
import { storage } from "@/lib/storage"
import { db } from "@/lib/db"
import { users } from "../../../../../db/schema"
import { eq } from "drizzle-orm"
import { generateInitialsAvatar } from "@/lib/avatar-generator"

/**
 * Public avatar proxy — streams the user's avatar image from S3.
 * Falls back to generating an initials avatar if no image exists.
 */
export const GET: APIRoute = async ({ params, url }) => {
    const userId = params.userId
    if (!userId) {
        return new Response("Not found", { status: 404 })
    }

    const key = url.searchParams.get("key")

    // Path 1: Explicit key provided — serve from S3
    if (key) {
        if (!key.startsWith(`avatars/${userId}/`)) {
            return new Response("Forbidden", { status: 403 })
        }

        try {
            const buffer = await storage.downloadFile(key)
            const contentType = key.endsWith('.webp') ? 'image/webp'
                : key.endsWith('.svg') ? 'image/svg+xml'
                : key.endsWith('.png') ? 'image/png'
                : key.endsWith('.jpg') || key.endsWith('.jpeg') ? 'image/jpeg'
                : 'image/png'

            return new Response(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": buffer.length.toString(),
                    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
                },
            })
        } catch {
            // S3 file missing — fall through to generate on-the-fly
        }
    }

    // Path 2: No key or S3 file missing — generate initials avatar on-the-fly
    const [user] = await db
        .select({ name: users.name, id: users.id })
        .from(users)
        .where(eq(users.id, userId))

    if (!user) {
        return new Response("Not found", { status: 404 })
    }

    const svg = generateInitialsAvatar(user.name, user.id)
    const svgBuffer = Buffer.from(svg, "utf-8")

    // Upload to S3 and update users.image in the background (fire-and-forget)
    const s3Key = `avatars/${user.id}/initials.svg`
    const proxyUrl = `/api/storage/avatar/${user.id}?key=${encodeURIComponent(s3Key)}`
    storage.uploadFile(s3Key, svgBuffer, "image/svg+xml")
        .then(() => db.update(users).set({ image: proxyUrl }).where(eq(users.id, user.id)))
        .then(() => console.log(`[Avatar] Generated fallback initials avatar for user ${user.id}`))
        .catch(err => console.error(`[Avatar] Failed to persist fallback avatar for ${user.id}:`, err))

    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Content-Length": svgBuffer.length.toString(),
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
    })
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/pages/api/storage/avatar/\\[userId\\].ts 2>&1 | grep -v 'node_modules\|notify.ts\|projects.test.ts'`
Expected: No new errors

**Step 3: Commit**

```bash
git add 'src/pages/api/storage/avatar/[userId].ts'
git commit -m "feat: add on-the-fly initials avatar fallback to avatar proxy"
```

---

### Task 5: Build Verification + Manual Test

**Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All existing tests pass + new avatar-generator tests pass

**Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: build verification for initials avatar feature"
```
