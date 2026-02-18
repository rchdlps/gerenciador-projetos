# Image Processing Design

**Date:** 2026-02-18
**Status:** Approved
**Approach:** Sharp + Inngest background processing

## Motivation

Images are currently stored as-is (raw uploads). Large photos slow down page loads, avatars are full-resolution, and there are no thumbnails for attachment previews. Processing images into optimized variants improves load times and reduces bandwidth.

## Architecture

### Processing Pipeline

1. **Upload handler** stores the original file to S3 (existing flow)
2. If the file is an image (`file.type.startsWith('image/')`), emit Inngest event `image/process`
3. **Inngest function** picks up the event:
   - Downloads the original from S3
   - Generates 3 variants using sharp:
     - **thumb**: 200x200, cover crop, WebP, quality 80
     - **medium**: 800px max width (auto height), WebP, quality 85
     - **optimized**: original dimensions, WebP, quality 85
   - Uploads variants back to S3
   - Updates the DB record with variant keys
4. **Frontend** uses variant URLs when available, falls back to original if not yet processed

### Storage Key Pattern

```
Original:  {entityId}/{nanoid}-photo.jpg
Thumb:     {entityId}/{nanoid}-photo.jpg.thumb.webp
Medium:    {entityId}/{nanoid}-photo.jpg.medium.webp
Optimized: {entityId}/{nanoid}-photo.jpg.optimized.webp
```

### Database Changes

Add `variants` JSONB column to `attachments` table:

```typescript
variants: jsonb('variants').$type<{
    thumb?: string    // S3 key
    medium?: string   // S3 key
    optimized?: string // S3 key
} | null>()
```

For avatars (stored in `users.image`), the Inngest function generates a resized version and updates `users.image` with the optimized URL directly.

### Inngest Integration

New event type in `src/lib/inngest/client.ts`:

```typescript
"image/process": {
    data: {
        key: string           // S3 key of original
        attachmentId?: string // DB ID (for attachments)
        userId?: string       // DB ID (for avatars)
        type: "attachment" | "avatar" | "logo"
    }
}
```

New function: `src/lib/inngest/functions/process-image.ts`
- Triggered by `image/process` event
- Downloads original from S3 via `GetObjectCommand`
- Processes with sharp (resize, compress, convert to WebP)
- Uploads variants to S3 via `storage.uploadFile()`
- Updates DB record (`attachments.variants` or `users.image`)

### Frontend Changes

- `attachment-list.tsx`: Use `variants.thumb` for preview tiles, `variants.medium` for lightbox
- Avatar components: Already URL-based, just gets a better URL after processing
- Fallback: If `variants` is null (not yet processed), show original as today

### Image Types Processed

All images entering the system:
- Task/project/knowledge area attachments
- User avatars
- Organization logos

### Processing Specs

| Variant | Max Size | Format | Quality | Crop |
|---------|----------|--------|---------|------|
| thumb | 200x200 | WebP | 80 | Cover (center) |
| medium | 800w auto-h | WebP | 85 | None (aspect preserved) |
| optimized | Original dims | WebP | 85 | None |

### Dependencies

- `sharp` — Node.js image processing (native binary, ~30MB in node_modules)
- Needs to be included in Docker build (already uses `node:24-slim` which supports sharp)

### Error Handling

- If processing fails, the original image remains accessible (graceful degradation)
- Inngest provides automatic retries (up to 3 attempts by default)
- Failed processing is logged but never blocks the user
