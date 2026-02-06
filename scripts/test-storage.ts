import "dotenv/config";
import { S3Client, PutBucketCorsCommand, ListBucketsCommand, PutObjectCommand } from "@aws-sdk/client-s3";

// Determine absolute endpoint URL
const endpoint = process.env.S3_ENDPOINT || "https://hel1.your-objectstorage.com";
const bucket = process.env.S3_BUCKET_NAME || "gerenciador-projetos";

console.log("🛠️  Testing Hetzner S3 Integration...");
console.log(`📍 Endpoint: ${endpoint}`);
console.log(`📍 Bucket: ${bucket}`);

const s3 = new S3Client({
    region: "us-east-1", // Force standard region for compatibility
    endpoint: endpoint,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
    requestHandler: {
        connectionTimeout: 5000,
        socketTimeout: 5000,
    } as any
});

async function main() {
    try {
        // 1. Test Connection / List Buckets
        console.log("\n📡 Connecting to S3...");
        const { Buckets } = await s3.send(new ListBucketsCommand({}));
        console.log("✅ Connection Successful!");

        const bucketExists = Buckets?.some((b) => b.Name === bucket);
        if (!bucketExists) {
            console.error(`❌ Bucket '${bucket}' does not exist! Please create it in the Hetzner Console.`);
            console.log("   Available Buckets:", Buckets?.map((b) => b.Name).join(", "));
            return;
        }
        console.log(`✅ Bucket '${bucket}' found.`);

        // 2. Configure CORS
        console.log("\n⚙️  Applying CORS Policy...");
        const corsParams = {
            Bucket: bucket,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"], // Allow all for now to verify integration, then restrict
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000,
                    },
                ],
            },
        };

        await s3.send(new PutBucketCorsCommand(corsParams));
        console.log("✅ CORS Policy applied successfully!");

        // 3. Test Upload
        console.log("\n📤 Testing Upload...");
        const testKey = "integration-test/hetzner-check.txt";
        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: testKey,
                Body: "Hello from Hetzner Integration Test!",
                ContentType: "text/plain",
            })
        );
        console.log(`✅ Uploaded test file to '${testKey}'`);
        console.log("\n🎉 Integration Verification Complete!");

    } catch (err: any) {
        console.error("\n❌ Error during S3 Integration:");
        console.error(err);
        process.exit(1);
    }
}

main();
