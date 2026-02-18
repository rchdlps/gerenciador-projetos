# Image Processing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Process uploaded images into optimized WebP variants (thumb, medium, optimized) using sharp in an Inngest background job.

**Architecture:** Upload handlers store the original file to S3, then emit an `image/process` Inngest event. A background function downloads the original, generates 3 WebP variants with sharp, uploads them to S3, and updates the DB. The frontend uses variant URLs when available, falling back to the original.

**Tech Stack:** `sharp` (image processing), `inngest` (background jobs), `@aws-sdk/client-s3` (storage), Drizzle ORM (DB schema migration)

---

## Task 1: Install sharp and add `downloadFile` to storage

**Files:**
- Modify: `package.json` (install sharp)
- Modify: `src/lib/storage.ts` (add downloadFile method)
- Modify: `src/test/mocks.ts` (add mock)

**Step 1: Install sharp**

Run: `npm install sharp`

**Step 2: Add `downloadFile` to `src/lib/storage.ts`**

Add this method to the `storage` object, after `uploadFile`:

```typescript
downloadFile: async (key: string): Promise<Buffer> => {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    })
    const response = await s3.send(command)
    const stream = response.Body
    if (!stream) throw new Error(`Empty response for key: ${key}`)
    // Convert readable stream to Buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
},
```

**Step 3: Add mock in `src/test/mocks.ts`**

Add `downloadFile` to the existing `mockStorage` object:

```typescript
downloadFile: vi.fn(() => Promise.resolve(Buffer.from('test-image-data'))),
```

**Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/storage.test.ts`
Expected: PASS (add a test that verifies `downloadFile` is exported)

**Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/storage.ts src/test/mocks.ts src/lib/__tests__/storage.test.ts
git commit -m "feat: install sharp and add downloadFile to storage layer"
```

---

## Task 2: Add `variants` column to attachments schema

**Files:**
- Modify: `db/schema.ts:208-222` (add variants column)

**Step 1: Add the column**

In `db/schema.ts`, add a `variants` column to the `attachments` table (after the `url` column at line 214):

```typescript
variants: jsonb("variants").$type<{
    thumb?: string
    medium?: string
    optimized?: string
} | null>(),
```

You need to import `jsonb` from drizzle-orm/pg-core if not already imported. Check the existing imports at the top of `db/schema.ts`.

**Step 2: Generate migration**

Run: `npx drizzle-kit generate`

**Step 3: Push schema**

Run: `npx drizzle-kit push`

**Step 4: Commit**

```bash
git add db/schema.ts drizzle/
git commit -m "feat: add variants JSONB column to attachments table"
```

---

## Task 3: Add `image/process` event type to Inngest client

**Files:**
- Modify: `src/lib/inngest/client.ts`

**Step 1: Add the event type**

The Inngest client currently uses `NotificationEvents` as its type. We need to add image events. Rename the type to be more general, or add a new union. The simplest approach: add image events to the same record.

First, rename `NotificationEvents` to `AppEvents` everywhere it's referenced, then add:

```typescript
"image/process": {
    data: {
        key: string
        attachmentId?: string
        userId?: string
        type: "attachment" | "avatar" | "logo"
    }
}
```

The full updated file should be:

```typescript
import { Inngest, EventSchemas } from "inngest";

// Event type definitions for type safety
export type AppEvents = {
    "notification/activity": {
        data: {
            userId: string;
            title: string;
            message: string;
            data?: Record<string, unknown>;
        };
    };
    "notification/system": {
        data: {
            title: string;
            message: string;
            data?: Record<string, unknown>;
        };
    };
    "notification/digest.send": {
        data: {};
    };
    "notification/scheduled": {
        data: {
            notificationId: string;
            scheduledFor: string;
        };
    };
    "notification/cancelled": {
        data: {
            notificationId: string;
        };
    };
    "image/process": {
        data: {
            key: string;
            attachmentId?: string;
            userId?: string;
            type: "attachment" | "avatar" | "logo";
        };
    };
};

// Initialize Inngest client with strict typing
export const inngest = new Inngest({
    id: "gerenciador-projetos",
    schemas: new EventSchemas().fromRecord<AppEvents>(),
});

// Export types for use in other files
export type AppEventType = keyof AppEvents;
```

**Step 2: Update references**

Search for `NotificationEvents` and `NotificationEventType` in the codebase and rename them to `AppEvents` and `AppEventType`. Check:
- `src/lib/inngest/client.ts` (definition — already updated above)
- Any file that imports these types

Run: `grep -r "NotificationEvents\|NotificationEventType" src/ --include="*.ts" --include="*.tsx"`

Update any found references.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "inngest/client" | head -5`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/lib/inngest/client.ts
git commit -m "feat: add image/process event type to Inngest client"
```

---

## Task 4: Create the image processing Inngest function

**Files:**
- Create: `src/lib/inngest/functions/process-image.ts`
- Modify: `src/pages/api/inngest.ts` (register function)

**Step 1: Create `src/lib/inngest/functions/process-image.ts`**

```typescript
import sharp from "sharp";
import { inngest } from "../client";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";
import { attachments, users, organizations } from "../../../../db/schema";
import { eq } from "drizzle-orm";

type VariantConfig = {
    suffix: string;
    width: number | null;
    height: number | null;
    fit: keyof sharp.FitEnum;
    quality: number;
};

const VARIANTS: VariantConfig[] = [
    { suffix: "thumb", width: 200, height: 200, fit: "cover", quality: 80 },
    { suffix: "medium", width: 800, height: null, fit: "inside", quality: 85 },
    { suffix: "optimized", width: null, height: null, fit: "inside", quality: 85 },
];

async function generateVariant(
    imageBuffer: Buffer,
    config: VariantConfig
): Promise<Buffer> {
    let pipeline = sharp(imageBuffer);

    if (config.width || config.height) {
        pipeline = pipeline.resize({
            width: config.width ?? undefined,
            height: config.height ?? undefined,
            fit: config.fit,
            withoutEnlargement: true,
        });
    }

    return pipeline.webp({ quality: config.quality }).toBuffer();
}

export const processImage = inngest.createFunction(
    {
        id: "process-image",
        retries: 3,
    },
    { event: "image/process" },
    async ({ event, step }) => {
        const { key, attachmentId, userId, type } = event.data;

        console.log(`[ImageProcessing] Processing ${type}: ${key}`);

        // Download original
        const originalBuffer = await step.run("download-original", async () => {
            const buffer = await storage.downloadFile(key);
            // Validate it's actually an image sharp can handle
            const metadata = await sharp(buffer).metadata();
            if (!metadata.format) {
                throw new Error(`Not a valid image: ${key}`);
            }
            console.log(
                `[ImageProcessing] Original: ${metadata.width}x${metadata.height} ${metadata.format} (${buffer.length} bytes)`
            );
            // Return as base64 since Inngest step results must be serializable
            return buffer.toString("base64");
        });

        const imageBuffer = Buffer.from(originalBuffer, "base64");

        // Generate and upload variants
        const variantKeys: Record<string, string> = {};

        for (const config of VARIANTS) {
            const variantKey = `${key}.${config.suffix}.webp`;

            await step.run(`generate-${config.suffix}`, async () => {
                const processed = await generateVariant(imageBuffer, config);
                await storage.uploadFile(variantKey, processed, "image/webp", processed.length);
                console.log(
                    `[ImageProcessing] Generated ${config.suffix}: ${processed.length} bytes -> ${variantKey}`
                );
            });

            variantKeys[config.suffix] = variantKey;
        }

        // Update DB record
        await step.run("update-db", async () => {
            if (type === "attachment" && attachmentId) {
                await db
                    .update(attachments)
                    .set({ variants: variantKeys })
                    .where(eq(attachments.id, attachmentId));
                console.log(`[ImageProcessing] Updated attachment ${attachmentId} with variants`);
            } else if (type === "avatar" && userId) {
                // For avatars, update user image to the optimized thumb
                const thumbUrl = storage.getPublicUrl(variantKeys.thumb);
                await db
                    .update(users)
                    .set({ image: thumbUrl })
                    .where(eq(users.id, userId));
                console.log(`[ImageProcessing] Updated user ${userId} avatar to optimized thumb`);
            } else if (type === "logo") {
                // Logo processing: update org logo URL to the thumb variant
                // Note: org ID would need to be passed in event data; for now just generate variants
                console.log(`[ImageProcessing] Logo variants generated (manual URL update needed)`);
            }
        });

        return {
            key,
            type,
            variants: variantKeys,
        };
    }
);

export const imageFunctions = [processImage];
```

**Step 2: Register in `src/pages/api/inngest.ts`**

Add import and include in functions array:

```typescript
import { imageFunctions } from "@/lib/inngest/functions/process-image";
```

Update the `functions` array:

```typescript
functions: [...notificationFunctions, ...adminNotificationFunctions, ...imageFunctions],
```

**Step 3: Verify types**

Run: `npx tsc --noEmit 2>&1 | grep "process-image\|inngest.ts" | head -5`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/lib/inngest/functions/process-image.ts src/pages/api/inngest.ts
git commit -m "feat: add image processing Inngest function with sharp"
```

---

## Task 5: Emit `image/process` event from upload handlers

**Files:**
- Modify: `src/server/routes/storage.ts` (POST /upload handler)
- Modify: `src/pages/api/storage/upload-avatar.ts`

**Step 1: Update `src/server/routes/storage.ts` POST /upload**

Add import at the top:
```typescript
import { inngest } from '@/lib/inngest/client'
```

After the `createAuditLog` call (around line 129, after DB insert and audit log), add:

```typescript
// Trigger background image processing for image files
if (file.type.startsWith('image/')) {
    inngest.send({
        name: "image/process",
        data: { key, attachmentId: attachment.id, type: "attachment" },
    }).catch(err => console.error("[Storage] Failed to emit image/process event:", err))
}
```

Note: fire-and-forget with `.catch()` — same pattern as audit logs. Never blocks the upload response.

**Step 2: Update `src/pages/api/storage/upload-avatar.ts`**

Add import:
```typescript
import { inngest } from "@/lib/inngest/client"
```

After the `db.update(users)` call (line 43), add:

```typescript
// Trigger background processing to optimize the avatar
if (file.type.startsWith('image/')) {
    inngest.send({
        name: "image/process",
        data: { key, userId: session.user.id, type: "avatar" },
    }).catch(err => console.error("[Storage] Failed to emit image/process event:", err))
}
```

**Step 3: Verify types**

Run: `npx tsc --noEmit 2>&1 | grep "storage" | head -5`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/server/routes/storage.ts src/pages/api/storage/upload-avatar.ts
git commit -m "feat: emit image/process event from upload handlers"
```

---

## Task 6: Update attachment list endpoint to include variant URLs

**Files:**
- Modify: `src/server/routes/storage.ts` (GET /:entityId handler)

**Step 1: Update the list handler**

The current GET handler generates signed URLs for the original key. Update it to also generate signed URLs for variants.

Replace the current `filesWithUrls` mapping (around line 182-185):

```typescript
const filesWithUrls = await Promise.all(files.map(async (file) => {
    const url = await storage.getDownloadUrl(file.key)
    return { ...file, url }
}))
```

With:

```typescript
const filesWithUrls = await Promise.all(files.map(async (file) => {
    const url = await storage.getDownloadUrl(file.key)

    // Generate signed URLs for image variants if they exist
    let variantUrls: Record<string, string> | null = null
    if (file.variants && typeof file.variants === 'object') {
        const v = file.variants as Record<string, string>
        const entries = await Promise.all(
            Object.entries(v).map(async ([name, variantKey]) => {
                const variantUrl = await storage.getDownloadUrl(variantKey)
                return [name, variantUrl] as const
            })
        )
        variantUrls = Object.fromEntries(entries)
    }

    return { ...file, url, variantUrls }
}))
```

**Step 2: Also update the delete handler to clean up variants**

In the DELETE handler (around line 207-211), update to also delete variant files:

Replace:
```typescript
await Promise.all([
    storage.deleteFile(file.key),
    db.delete(attachments).where(eq(attachments.id, id)),
])
```

With:
```typescript
const deletePromises: Promise<void>[] = [
    storage.deleteFile(file.key),
    db.delete(attachments).where(eq(attachments.id, id)).then(() => {}),
]
// Also delete variant files
if (file.variants && typeof file.variants === 'object') {
    const v = file.variants as Record<string, string>
    for (const variantKey of Object.values(v)) {
        deletePromises.push(storage.deleteFile(variantKey).catch(() => {}))
    }
}
await Promise.all(deletePromises)
```

**Step 3: Commit**

```bash
git add src/server/routes/storage.ts
git commit -m "feat: include variant URLs in attachment list and clean up on delete"
```

---

## Task 7: Update frontend `AttachmentList` to use variants

**Files:**
- Modify: `src/components/attachments/attachment-list.tsx`

**Step 1: Update the `Attachment` type**

Add `variantUrls` to the type:

```typescript
export type Attachment = {
    id: string
    fileName: string
    fileType: string
    fileSize: number
    url?: string
    variantUrls?: {
        thumb?: string
        medium?: string
        optimized?: string
    } | null
    createdAt: string
    uploadedBy: string
}
```

**Step 2: Use thumb variant for preview tile**

Replace line 44-45:
```tsx
{isImage && file.url ? (
    <img src={file.url} alt={file.fileName} className="h-full w-full object-cover" loading="lazy" />
```

With:
```tsx
{isImage && (file.variantUrls?.thumb || file.url) ? (
    <img src={file.variantUrls?.thumb || file.url} alt={file.fileName} className="h-full w-full object-cover" loading="lazy" />
```

**Step 3: Use medium variant for lightbox**

Replace line 71:
```tsx
<img src={file.url} alt={file.fileName} className="w-full h-auto rounded-lg" loading="lazy" />
```

With:
```tsx
<img src={file.variantUrls?.medium || file.url} alt={file.fileName} className="w-full h-auto rounded-lg" loading="lazy" />
```

**Step 4: Update the lightbox trigger condition (line 63)**

Replace:
```tsx
{isImage && file.url && (
```

With:
```tsx
{isImage && (file.variantUrls?.medium || file.url) && (
```

**Step 5: Commit**

```bash
git add src/components/attachments/attachment-list.tsx
git commit -m "feat: use image variants for thumbnails and previews in attachment list"
```

---

## Task 8: Build and test

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors in changed files.

**Step 2: Run tests**

Run: `npm run test:run`
Expected: All existing passing tests still pass.

**Step 3: Run build**

Run: `npm run build`
Expected: Clean build.

**Step 4: Fix any issues found**

If sharp causes build issues with the Astro/Vite bundler, you may need to add it to `vite.config` externals or `astro.config.mjs`. Check if the build error mentions sharp and add:

In `astro.config.mjs`, under the vite config:
```typescript
vite: {
    ssr: {
        external: ['sharp'],
    },
},
```

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues with sharp integration"
```

---

## Summary of Changes

| Task | What | Files |
|------|------|-------|
| 1 | Install sharp, add `downloadFile` | `package.json`, `storage.ts`, `mocks.ts` |
| 2 | Add `variants` JSONB column | `db/schema.ts`, migration |
| 3 | Add `image/process` event type | `inngest/client.ts` |
| 4 | Create processing Inngest function | `inngest/functions/process-image.ts`, `api/inngest.ts` |
| 5 | Emit events from upload handlers | `routes/storage.ts`, `upload-avatar.ts` |
| 6 | Include variant URLs in API responses | `routes/storage.ts` (list + delete) |
| 7 | Use variants in frontend | `attachment-list.tsx` |
| 8 | Build and integration test | Various |
