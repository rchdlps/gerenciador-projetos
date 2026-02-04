# Plan: MinIO S3 Attachments System

## Goal
Implement a robust file attachment system using MinIO (S3-compatible object storage) to allow users to attach files to various entities (Tasks, Projects) across the application.

## User Review Required
> [!IMPORTANT]
> **Infrastructure Change**: This plan requires adding a new `minio` service to `docker-compose.yml`. You will need to restart your docker containers.

> [!QUESTION]
> **Bucket Policy**: Should files be public-read (easier for images) or private (requires signed URLs for access)?
> *Assumption*: We will implement **Private** by default with Presigned URLs for maximum security.

## Proposed Changes

### Infrastructure
#### [MODIFY] [docker-compose.yml](file:///home/richard/code/gerenciador-projetos/docker-compose.yml)
- Add `minio` service (Object Storage).
- Add `createbuckets` entrypoint script or manual setup instructions.
- Expose ports `9000` (API) and `9001` (Console).

#### [MODIFY] [.env](file:///home/richard/code/gerenciador-projetos/.env)
- Add `S3_ENDPOINT`, `S3_PORT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`.

### Database
#### [MODIFY] [db/schema.ts](file:///home/richard/code/gerenciador-projetos/db/schema.ts)
- Create `attachments` table:
    - `id` (string, pk)
    - `fileName` (string)
    - `fileType` (string)
    - `fileSize` (number)
    - `key` (string, S3 object key)
    - `url` (string, optional public url)
    - `entityId` (string, indexed) - ID of Task/Project
    - `entityType` (enum: 'task', 'project', 'comment')
    - `uploadedBy` (string, fk users)
    - `createdAt`

### Backend (Hono)
#### [NEW] [src/lib/storage.ts](file:///home/richard/code/gerenciador-projetos/src/lib/storage.ts)
- Initialize `@aws-sdk/client-s3`.
- Helper functions: `getUploadUrl`, `getDownloadUrl`, `deleteFile`.

#### [NEW] [src/server/routes/storage.ts](file:///home/richard/code/gerenciador-projetos/src/server/routes/storage.ts)
- `POST /presigned-url`: Generates a URL for the frontend to upload directly to MinIO.
- `POST /confirm`: Records the upload in the `attachments` table.
- `GET /:entityType/:entityId`: Lists attachments for an entity.
- `DELETE /:id`: Removes file from DB and S3.

### Frontend (React)
#### [NEW] [src/components/ui/file-upload.tsx](file:///home/richard/code/gerenciador-projetos/src/components/ui/file-upload.tsx)
- Reusable Dropzone component using `react-dropzone`.
- Handles file selection and upload progress.

#### [NEW] [src/components/attachments/attachment-list.tsx](file:///home/richard/code/gerenciador-projetos/src/components/attachments/attachment-list.tsx)
- Displays list of files with icons.
- Download / Delete actions.
- Preview for images.

#### [MODIFY] [src/components/dashboard/task-details.tsx](file:///home/richard/code/gerenciador-projetos/src/components/dashboard/task-details.tsx)
- Integrate `AttachmentList` and `FileUpload` in a "Attachments" tab or section.

## Verification Plan

### Automated Tests
- [ ] Test S3 connection on startup.
- [ ] Test Presigned URL generation.

### Manual Verification
1. Start MinIO via Docker.
2. Configure `.env` with credentials.
3. Open Task Details.
4. Upload an image.
5. Verify image appears in the list.
6. Verify image is stored in MinIO Console (localhost:9001).
7. Delete image and verify removal.
