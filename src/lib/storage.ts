import "dotenv/config" // Ensure env vars are loaded
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const accessKeyId = process.env.S3_ACCESS_KEY
const secretAccessKey = process.env.S3_SECRET_KEY

if (!accessKeyId || !secretAccessKey) {
    console.error("[Storage] Missing S3 Credentials in environment variables!")
}

// Initialize S3 Client
const s3 = new S3Client({
    region: "us-east-1", // MUST be us-east-1 for MinIO/Hetzner/R2 compatibility
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || ""
    },
    forcePathStyle: true // Needed for MinIO/Hetzner
})

console.log('[S3 Init] Env Check:', {
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    hasAccessKey: !!process.env.S3_ACCESS_KEY,
    hasSecret: !!process.env.S3_ACCESS_KEY,
    bucket: process.env.S3_BUCKET_NAME
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME!

export const storage = {
    // Generate Pre-signed URL for Upload (PUT)
    getUploadUrl: async (key: string, fileType: string) => {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: fileType
        })
        return await getSignedUrl(s3, command, { expiresIn: 3600 })
    },

    // Generate Pre-signed URL for Download (GET)
    getDownloadUrl: async (key: string) => {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        })
        return await getSignedUrl(s3, command, { expiresIn: 3600 })
    },

    // Delete file
    deleteFile: async (key: string) => {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        })
        await s3.send(command)
    },

    // Check if bucket exists/Create bucket (optional util)
    ensureBucket: async () => {
        // Implementation omitted for brevity, usually handled by infra/docker
    }
}
