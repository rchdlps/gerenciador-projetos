import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Initialize S3 Client
const s3 = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin"
    },
    forcePathStyle: true // Needed for MinIO
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "gerenciador-projetos"

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
