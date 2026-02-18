import "dotenv/config"
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Railway-injected vars take precedence over legacy S3_* vars (local dev / MinIO fallback)
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
