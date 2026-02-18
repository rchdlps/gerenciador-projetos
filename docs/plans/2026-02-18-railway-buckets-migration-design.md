# Railway Buckets Migration Design

**Date:** 2026-02-18
**Status:** Approved
**Approach:** Hybrid — server-proxied uploads + pre-signed downloads

## Motivation

- **Consolidate infrastructure:** App, DB, and storage all under Railway
- **Reduce latency:** Hetzner Object Storage (EU) is far from Railway's infra; Railway-to-Railway storage is fast

## Current State

- Storage: Hetzner Object Storage (S3-compatible, `fsn1.your-objectstorage.com`)
- Client: `@aws-sdk/client-s3` with pre-signed URLs for both upload and download
- Upload flow: 2 requests (get pre-signed URL → client uploads to S3 → confirm in DB)
- Env vars: `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`

## Target State

- Storage: Railway Object Storage (S3-compatible, `storage.railway.app`, backed by Tigris)
- Upload flow: 1 request (client sends multipart/form-data to server → server uploads to S3 → records in DB)
- Download flow: Pre-signed GET URLs (unchanged)
- Env vars: Railway-injected `ENDPOINT`, `REGION`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `BUCKET`

## Design

### 1. Storage Layer (`src/lib/storage.ts`)

Rewrite S3Client initialization to read Railway-injected vars with fallback to `S3_*` vars for local dev:

```
ENDPOINT > S3_ENDPOINT
ACCESS_KEY_ID > S3_ACCESS_KEY
SECRET_ACCESS_KEY > S3_SECRET_KEY
BUCKET > S3_BUCKET_NAME
REGION > S3_REGION (default: us-east-1)
```

Methods:
- **Remove:** `getUploadUrl` (pre-signed PUT no longer needed)
- **Add:** `uploadFile(key: string, body: Buffer | ReadableStream, contentType: string, contentLength: number)` — direct PutObjectCommand
- **Keep:** `getDownloadUrl` (pre-signed GET), `deleteFile`, `getPublicUrl`

### 2. Upload Route (`src/server/routes/storage.ts`)

New endpoint: `POST /upload`
- Accepts `multipart/form-data` with fields: `file`, `entityId`, `entityType`
- Uses Hono's `c.req.parseBody()` for multipart parsing (no extra dependency)
- Enforces 50 MB file size limit server-side
- Generates key: `{entityId}/{nanoid}-{fileName}`
- Calls `storage.uploadFile()` to push to Railway S3
- Creates `attachments` record in DB
- Returns attachment with signed download URL

Deprecation: Keep `POST /presigned-url` temporarily with a `console.warn` deprecation log.

### 3. Download Route (unchanged)

`GET /storage/:entityId` returns attachments with fresh pre-signed download URLs. Railway Buckets support pre-signed URLs natively.

### 4. Environment Variables

**Railway (production):** Auto-injected when bucket is linked to the service: `BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `ENDPOINT`, `REGION`.

**Local dev:** Keep `S3_*` vars in `.env` pointing to MinIO or Railway bucket directly.

**Dockerfile:** No new build args needed (Railway injects at runtime). Remove any Hetzner-specific S3 build args if present.

### 5. Client-Side Changes

Update upload components to send `multipart/form-data` to `POST /api/storage/upload` instead of the 2-step pre-signed flow. One `fetch` with `FormData` replaces: get URL → PUT to S3 → confirm.

### 6. Data Migration

- No immediate migration needed — new files go to Railway bucket
- Old Hetzner files remain accessible if `S3_*` fallback vars are kept
- Optional future step: `aws s3 sync` from Hetzner to Railway bucket for full consolidation

## Railway Buckets Details

- S3-compatible (works with `@aws-sdk/client-s3`)
- Pricing: $0.015/GB-month, unlimited operations and egress
- Supports: object ops, multipart uploads, pre-signed URLs, object tagging
- Does NOT support: server-side encryption, versioning, object locks, lifecycle policies
- Buckets are private by default (no public bucket option yet)
- Backed by Tigris infrastructure

## Sources

- [Railway Storage Buckets Docs](https://docs.railway.com/storage-buckets)
- [Railway Data & Storage](https://docs.railway.com/data-storage)
