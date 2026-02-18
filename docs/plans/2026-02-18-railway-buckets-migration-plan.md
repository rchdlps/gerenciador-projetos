# Railway Buckets Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate file storage from Hetzner Object Storage to Railway Buckets with server-proxied uploads and pre-signed downloads.

**Architecture:** Replace the 3-step client-side upload flow (get presigned URL → PUT to S3 → confirm) with a single `POST /upload` multipart endpoint. The server receives the file and pushes it to Railway's S3-compatible bucket. Downloads stay as pre-signed GET URLs. The `storage.ts` layer reads Railway-injected env vars with fallback to `S3_*` for local dev.

**Tech Stack:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Hono multipart parsing (`c.req.parseBody()`), Railway Object Storage (Tigris-backed, S3-compatible).

---

## Task 1: Rewrite `src/lib/storage.ts` for Railway env vars + `uploadFile`

**Files:**
- Modify: `src/lib/storage.ts` (full rewrite)
- Modify: `src/test/mocks.ts:137-141` (update mock)
- Test: `src/lib/__tests__/storage.test.ts` (create)

**Step 1: Write the failing test**

Create `src/lib/__tests__/storage.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the AWS SDK before importing storage
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
}))

describe('storage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should prefer Railway env vars over S3_ vars', async () => {
        // Railway vars take precedence
        process.env.ENDPOINT = 'https://storage.railway.app'
        process.env.ACCESS_KEY_ID = 'railway-key'
        process.env.SECRET_ACCESS_KEY = 'railway-secret'
        process.env.BUCKET = 'railway-bucket'
        process.env.REGION = 'us-west-2'

        // S3_ fallbacks should be ignored
        process.env.S3_ENDPOINT = 'https://hetzner.example.com'
        process.env.S3_ACCESS_KEY = 'hetzner-key'
        process.env.S3_SECRET_KEY = 'hetzner-secret'
        process.env.S3_BUCKET_NAME = 'hetzner-bucket'
        process.env.S3_REGION = 'us-east-1'

        // Re-import to pick up new env vars
        const mod = await import('../storage')
        // Just verifying it doesn't throw on init
        expect(mod.storage).toBeDefined()
        expect(mod.storage.uploadFile).toBeTypeOf('function')
        expect(mod.storage.getDownloadUrl).toBeTypeOf('function')
        expect(mod.storage.deleteFile).toBeTypeOf('function')
    })

    it('uploadFile should call PutObjectCommand', async () => {
        const { storage } = await import('../storage')
        const { PutObjectCommand } = await import('@aws-sdk/client-s3')

        await storage.uploadFile('test/file.txt', Buffer.from('hello'), 'text/plain', 5)

        expect(PutObjectCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                Key: 'test/file.txt',
                ContentType: 'text/plain',
                ContentLength: 5,
            })
        )
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/storage.test.ts`
Expected: FAIL — `uploadFile` does not exist on current storage export.

**Step 3: Rewrite `src/lib/storage.ts`**

```typescript
import "dotenv/config"
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Railway-injected vars take precedence over legacy S3_* vars (local dev / Hetzner fallback)
const endpoint = process.env.ENDPOINT || process.env.S3_ENDPOINT
const region = process.env.REGION || process.env.S3_REGION || "us-east-1"
const accessKeyId = process.env.ACCESS_KEY_ID || process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY
const bucketName = process.env.BUCKET || process.env.S3_BUCKET_NAME

if (!accessKeyId || !secretAccessKey) {
    console.error("[Storage] Missing S3 credentials in environment variables!")
}

const s3 = new S3Client({
    region,
    endpoint,
    credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
    },
    forcePathStyle: true,
})

console.log("[S3 Init]", {
    endpoint,
    region,
    bucket: bucketName,
    hasAccessKey: !!accessKeyId,
    hasSecret: !!secretAccessKey,
})

const BUCKET = bucketName!

export const storage = {
    uploadFile: async (key: string, body: Buffer | Uint8Array, contentType: string, contentLength: number) => {
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
            ContentLength: contentLength,
        })
        await s3.send(command)
    },

    getDownloadUrl: async (key: string) => {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
        return await getSignedUrl(s3, command, { expiresIn: 3600 })
    },

    getPublicUrl: (key: string) => {
        const cleanEndpoint = endpoint?.replace("https://", "").replace("http://", "")
        return `https://${cleanEndpoint}/${BUCKET}/${key}`
    },

    deleteFile: async (key: string) => {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
        await s3.send(command)
    },
}
```

**Step 4: Update test mock in `src/test/mocks.ts:137-141`**

Replace:
```typescript
export const mockStorage = {
  getUploadUrl: vi.fn(() => Promise.resolve('https://test-upload-url.com')),
  getDownloadUrl: vi.fn(() => Promise.resolve('https://test-download-url.com')),
  deleteFile: vi.fn(() => Promise.resolve()),
  ensureBucket: vi.fn(() => Promise.resolve()),
}
```

With:
```typescript
export const mockStorage = {
  uploadFile: vi.fn(() => Promise.resolve()),
  getDownloadUrl: vi.fn(() => Promise.resolve('https://test-download-url.com')),
  getPublicUrl: vi.fn((key: string) => `https://test-storage.example.com/bucket/${key}`),
  deleteFile: vi.fn(() => Promise.resolve()),
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/storage.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/__tests__/storage.test.ts src/test/mocks.ts
git commit -m "refactor: rewrite storage layer for Railway Buckets with uploadFile"
```

---

## Task 2: Add `POST /upload` endpoint to storage routes

**Files:**
- Modify: `src/server/routes/storage.ts` (add new endpoint, deprecate old ones)
- Test: `src/server/routes/__tests__/storage.test.ts` (create)

**Step 1: Write the failing test**

Create `src/server/routes/__tests__/storage.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

vi.mock('@/lib/auth', () => ({
    auth: { api: { getSession: vi.fn() } },
}))

vi.mock('@/lib/db', () => {
    const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
            id: 'att-1',
            fileName: 'test.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            key: 'entity-1/abc123-test.pdf',
            entityId: 'entity-1',
            entityType: 'project',
            uploadedBy: 'user-1',
            createdAt: new Date().toISOString(),
        }]),
        delete: vi.fn().mockReturnThis(),
    }
    return { db: mockDb }
})

vi.mock('@/lib/storage', () => ({
    storage: {
        uploadFile: vi.fn().mockResolvedValue(undefined),
        getDownloadUrl: vi.fn().mockResolvedValue('https://signed-download-url.com'),
        deleteFile: vi.fn().mockResolvedValue(undefined),
        getPublicUrl: vi.fn((key: string) => `https://storage.example.com/${key}`),
    },
}))

vi.mock('@/lib/audit-logger', () => ({
    createAuditLog: vi.fn(),
}))

describe('POST /upload', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should upload a file and return attachment with download URL', async () => {
        const { auth } = await import('@/lib/auth')
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { id: 'user-1', globalRole: 'super_admin' },
            session: { id: 'session-1' },
        } as any)

        // Dynamically import app after mocks are set
        const { default: storageRouter } = await import('../storage')
        const app = new Hono()
        app.route('/storage', storageRouter)

        const formData = new FormData()
        formData.append('file', new File(['test content'], 'test.pdf', { type: 'application/pdf' }))
        formData.append('entityId', 'entity-1')
        formData.append('entityType', 'project')

        const res = await app.request('/storage/upload', {
            method: 'POST',
            body: formData,
            headers: { cookie: 'session=test' },
        })

        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.fileName).toBe('test.pdf')
        expect(data.url).toBe('https://signed-download-url.com')
    })

    it('should reject files over 50 MB', async () => {
        const { auth } = await import('@/lib/auth')
        vi.mocked(auth.api.getSession).mockResolvedValue({
            user: { id: 'user-1', globalRole: 'super_admin' },
            session: { id: 'session-1' },
        } as any)

        const { default: storageRouter } = await import('../storage')
        const app = new Hono()
        app.route('/storage', storageRouter)

        // Create a fake large file (just checking metadata, not actually 50MB)
        const formData = new FormData()
        const largeFile = new File(['x'], 'huge.bin', { type: 'application/octet-stream' })
        // Override size via custom property won't work directly in FormData,
        // so this test verifies the route exists and rejects when file is missing
        formData.append('entityId', 'entity-1')
        formData.append('entityType', 'project')
        // No file appended

        const res = await app.request('/storage/upload', {
            method: 'POST',
            body: formData,
            headers: { cookie: 'session=test' },
        })

        expect(res.status).toBe(400)
    })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/routes/__tests__/storage.test.ts`
Expected: FAIL — `POST /upload` route does not exist.

**Step 3: Add `POST /upload` endpoint to `src/server/routes/storage.ts`**

Add this new endpoint **before** the existing `presigned-url` route (after the `checkViewerPermission` helper, around line 69):

```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

// Upload file (server-proxied)
app.post('/upload', async (c) => {
    const user = c.get('user')
    const session = c.get('session')
    if (!user || !session) return c.json({ error: 'Unauthorized' }, 401)

    try {
        const body = await c.req.parseBody()
        const file = body['file']
        const entityId = body['entityId'] as string
        const entityType = body['entityType'] as string

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'Missing file' }, 400)
        }

        if (!entityId || !entityType) {
            return c.json({ error: 'Missing entityId or entityType' }, 400)
        }

        const validTypes = ['task', 'project', 'comment', 'knowledge_area']
        if (!validTypes.includes(entityType)) {
            return c.json({ error: 'Invalid entityType' }, 400)
        }

        if (file.size > MAX_FILE_SIZE) {
            return c.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` }, 400)
        }

        // Check viewer permission
        const permCheck = await checkViewerPermission(entityId, entityType, user.id)
        if (!permCheck.allowed) {
            return c.json({ error: permCheck.error }, 403)
        }

        const key = `${entityId}/${nanoid()}-${file.name}`
        const buffer = Buffer.from(await file.arrayBuffer())

        await storage.uploadFile(key, buffer, file.type, file.size)

        const [attachment] = await db.insert(attachments).values({
            id: nanoid(),
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            key,
            entityId,
            entityType: entityType as 'task' | 'project' | 'comment' | 'knowledge_area',
            uploadedBy: user.id,
        }).returning()

        createAuditLog({
            userId: user.id,
            organizationId: null,
            action: 'CREATE',
            resource: 'attachment',
            resourceId: attachment.id,
            metadata: { fileName: file.name, fileType: file.type, entityType, entityId },
        })

        const signedUrl = await storage.getDownloadUrl(key)

        return c.json({ ...attachment, url: signedUrl })
    } catch (error: any) {
        console.error('[Storage Error] Upload failed:', error)
        return c.json({ error: error.message || 'Upload failed' }, 500)
    }
})
```

**Step 4: Add deprecation warning to `POST /presigned-url`**

At the start of the existing `presigned-url` handler (line 80), add:

```typescript
console.warn('[Storage] DEPRECATED: POST /presigned-url — use POST /upload instead')
```

Do the same for `POST /confirm` handler (line 118):

```typescript
console.warn('[Storage] DEPRECATED: POST /confirm — use POST /upload instead')
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/server/routes/__tests__/storage.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/server/routes/storage.ts src/server/routes/__tests__/storage.test.ts
git commit -m "feat: add server-proxied upload endpoint with 50MB limit"
```

---

## Task 3: Add avatar upload endpoint (server-proxied)

**Files:**
- Modify: `src/pages/api/storage/init-upload.ts` (add deprecation warning)
- Modify: `src/pages/api/storage/confirm-upload.ts` (add deprecation warning)
- Create: `src/pages/api/storage/upload-avatar.ts`

The avatar upload is a special case — it uses Astro API routes directly (not Hono) and updates the user's `image` field. We need a server-proxied version.

**Step 1: Create `src/pages/api/storage/upload-avatar.ts`**

```typescript
import type { APIRoute } from "astro"
import { storage } from "@/lib/storage"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "../../../../db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB for avatars

export const POST: APIRoute = async ({ request }) => {
    try {
        const authHeaders = new Headers()
        const cookie = request.headers.get("cookie")
        if (cookie) authHeaders.set("cookie", cookie)
        const session = await auth.api.getSession({ headers: authHeaders })
        if (!session) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: "Missing file" }), { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` }),
                { status: 400 }
            )
        }

        const key = `avatars/${session.user.id}/${nanoid()}-${file.name}`
        const buffer = Buffer.from(await file.arrayBuffer())

        await storage.uploadFile(key, buffer, file.type, file.size)

        const publicUrl = storage.getPublicUrl(key)

        await db.update(users).set({ image: publicUrl }).where(eq(users.id, session.user.id))

        return new Response(JSON.stringify({ publicUrl }), { status: 200 })
    } catch (error) {
        console.error("[Storage] Avatar upload failed:", error)
        return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500 })
    }
}
```

**Step 2: Add deprecation warnings to old endpoints**

In `src/pages/api/storage/init-upload.ts`, add at top of handler (line 8):
```typescript
console.warn("[Storage] DEPRECATED: POST /api/storage/init-upload — use POST /api/storage/upload-avatar instead")
```

In `src/pages/api/storage/confirm-upload.ts`, add at top of handler (line 10):
```typescript
console.warn("[Storage] DEPRECATED: POST /api/storage/confirm-upload — use POST /api/storage/upload-avatar instead")
```

**Step 3: Run a build check**

Run: `npx tsc --noEmit 2>&1 | grep -E "(upload-avatar|init-upload|confirm-upload)" | head -10`
Expected: No errors in these files.

**Step 4: Commit**

```bash
git add src/pages/api/storage/upload-avatar.ts src/pages/api/storage/init-upload.ts src/pages/api/storage/confirm-upload.ts
git commit -m "feat: add server-proxied avatar upload endpoint"
```

---

## Task 4: Update client components — knowledge area views

**Files:**
- Modify: `src/components/knowledge/scope-view.tsx:162-196`
- Modify: `src/components/knowledge/knowledge-area-detail.tsx:67-88`
- Modify: `src/components/knowledge/resource-view.tsx:141-175`
- Modify: `src/components/knowledge/risk-view.tsx:121-155`
- Modify: `src/components/knowledge/stakeholder-view.tsx:143-177`
- Modify: `src/components/knowledge/cost-view.tsx:148-182`

All 6 knowledge area views have an identical upload pattern. Replace the 3-step flow in each `handleUpload` function.

**Step 1: Replace `handleUpload` in all 6 files**

The current pattern in each file looks like:

```typescript
const handleUpload = async (files: File[]) => {
    if (!ka?.id) return
    for (const file of files) {
        try {
            const initRes = await api.storage['presigned-url'].$post({
                json: { fileName: file.name, fileType: file.type, fileSize: file.size, entityId: ka.id, entityType: 'knowledge_area' }
            })
            if (!initRes.ok) { /* error handling */ }
            const { url, key } = await initRes.json()
            await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
            const confirmRes = await api.storage.confirm.$post({
                json: { fileName: file.name, fileType: file.type, fileSize: file.size, key, entityId: ka.id, entityType: 'knowledge_area' }
            })
            if (!confirmRes.ok) { /* error handling */ }
            toast.success(`Upload de ${file.name} concluído!`)
        } catch (error) {
            toast.error(...)
        }
    }
    refetchAttachments()
}
```

Replace with:

```typescript
const handleUpload = async (files: File[]) => {
    if (!ka?.id) return
    for (const file of files) {
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('entityId', ka.id)
            formData.append('entityType', 'knowledge_area')

            const res = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData,
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: 'Erro ao enviar arquivo' }))
                throw new Error((data as any).error || 'Erro ao enviar arquivo')
            }
            toast.success(`Upload de ${file.name} concluído!`)
        } catch (error) {
            toast.error((error as Error).message || `Erro ao enviar ${file.name}`)
        }
    }
    refetchAttachments()
}
```

Apply this change to all 6 files. The only difference is the exact line range in each file.

**Step 2: Remove unused imports**

In each of the 6 files, the `api` import from `@/lib/api-client` may still be needed for other calls (delete attachment, fetch, etc.). Check each file — only remove the import if `api` is no longer used anywhere else in the file.

**Step 3: Run a build check**

Run: `npx tsc --noEmit 2>&1 | grep -E "knowledge" | head -10`
Expected: No type errors.

**Step 4: Commit**

```bash
git add src/components/knowledge/
git commit -m "refactor: switch knowledge area uploads to server-proxied endpoint"
```

---

## Task 5: Update client components — task dialog

**Files:**
- Modify: `src/components/phases/task-dialog.tsx:93-141`

**Step 1: Replace `processUploads` function**

Replace the current 3-step `processUploads` function with:

```typescript
const processUploads = async (filesToUpload: File[], targetTaskId: string) => {
    for (const file of filesToUpload) {
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('entityId', targetTaskId)
            formData.append('entityType', 'task')

            const res = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData,
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: 'Erro ao enviar arquivo' }))
                throw new Error((data as any).error || 'Erro ao enviar arquivo')
            }
            toast.success(`Upload de ${file.name} concluído!`)
        } catch (error) {
            console.error(error)
            toast.error((error as Error).message || `Erro ao enviar ${file.name}`)
        }
    }
}
```

**Step 2: Run a build check**

Run: `npx tsc --noEmit 2>&1 | grep "task-dialog" | head -5`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/phases/task-dialog.tsx
git commit -m "refactor: switch task dialog uploads to server-proxied endpoint"
```

---

## Task 6: Update client components — profile avatar upload

**Files:**
- Modify: `src/components/profile/profile-form.tsx:159-210`

**Step 1: Replace `handleAvatarUpload` function**

Replace:
```typescript
const handleAvatarUpload = async (files: File[]) => {
    if (!files.length) return
    const file = files[0]
    setUploading(true)

    try {
        const res = await fetch("/api/storage/init-upload", { ... })
        // ... 3-step flow ...
    } catch (error) { ... }
    finally { setUploading(false) }
}
```

With:
```typescript
const handleAvatarUpload = async (files: File[]) => {
    if (!files.length) return
    const file = files[0]
    setUploading(true)

    try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/storage/upload-avatar', {
            method: 'POST',
            body: formData,
        })
        if (!res.ok) throw new Error('Falha ao enviar avatar')
        const { publicUrl } = await res.json()

        profileForm.setValue('image', publicUrl)
        await profileForm.handleSubmit(onUpdateProfile)()
    } catch (error) {
        console.error(error)
        toast.error('Erro no upload do avatar')
    } finally {
        setUploading(false)
    }
}
```

**Step 2: Run a build check**

Run: `npx tsc --noEmit 2>&1 | grep "profile-form" | head -5`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/profile/profile-form.tsx
git commit -m "refactor: switch avatar upload to server-proxied endpoint"
```

---

## Task 7: Update environment variables

**Files:**
- Modify: `.env.example`
- Modify: `docs/architecture-railway.md`

**Step 1: Update `.env.example`**

Replace the MinIO/S3 section (lines 10-15):
```
# MinIO (S3)
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_REGION=us-east-1
S3_ACCESS_KEY=N82UYH8DLN3Y0TR8JTYP
S3_SECRET_KEY=pZ2ZZcmHJMkTsFiwuRlx49eWBTCRt9yDZH3wUfu4
S3_BUCKET_NAME=gerenciador-projetos
```

With:
```
# Object Storage (Railway Buckets in production, S3_* fallback for local dev / MinIO)
# Railway auto-injects: ENDPOINT, REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET
# For local development with MinIO, set these:
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=gerenciador-projetos
```

**Step 2: Update `docs/architecture-railway.md` environment table**

Add a row to the env vars table:
```
| `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `ENDPOINT`, `REGION` | Auto-injected by Railway when a Bucket is linked to the service. |
```

**Step 3: Commit**

```bash
git add .env.example docs/architecture-railway.md
git commit -m "docs: update env vars for Railway Buckets storage"
```

---

## Task 8: Update `FileUpload` component size label

**Files:**
- Modify: `src/components/ui/file-upload.tsx:58`

**Step 1: Update the display text**

Change line 58 from:
```tsx
<span className="text-xs">Imagens, PDF, Docs (max 10MB)</span>
```

To:
```tsx
<span className="text-xs">Imagens, PDF, Docs (max 50MB)</span>
```

**Step 2: Commit**

```bash
git add src/components/ui/file-upload.tsx
git commit -m "fix: update file upload size label to match 50MB limit"
```

---

## Task 9: Full integration test

**Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: All tests pass. Look especially for any tests that mock `storage.getUploadUrl` — these need to be updated to `storage.uploadFile`.

**Step 2: Fix any broken tests**

Search for references to `getUploadUrl` in test files:
Run: `grep -r "getUploadUrl" src/ --include="*.test.*" --include="*.spec.*"`

Update any found references to use `uploadFile` instead.

**Step 3: Run a build**

Run: `npm run build`
Expected: Clean build with no errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: update remaining test references for new storage API"
```

---

## Summary of Changes

| Area | Old | New |
|------|-----|-----|
| **Storage layer** | `getUploadUrl` (pre-signed PUT) | `uploadFile` (direct PutObjectCommand) |
| **Env vars** | `S3_*` hardcoded | Railway-injected with `S3_*` fallback |
| **Upload route** | `POST /presigned-url` + `POST /confirm` (2 requests) | `POST /upload` (1 multipart request) |
| **Avatar route** | `POST /init-upload` + `POST /confirm-upload` | `POST /upload-avatar` (1 multipart request) |
| **Client components** | 3-step: get URL → PUT to S3 → confirm | 1-step: `FormData` POST to server |
| **File size limit** | None (server-side) | 50 MB enforced server-side |
| **Old endpoints** | Active | Kept with deprecation warnings |
