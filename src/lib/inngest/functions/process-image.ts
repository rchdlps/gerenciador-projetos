import sharp from "sharp";
import { inngest } from "../client";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";
import { attachments, users } from "../../../../db/schema";
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
            const metadata = await sharp(buffer).metadata();
            if (!metadata.format) {
                throw new Error(`Not a valid image: ${key}`);
            }
            console.log(
                `[ImageProcessing] Original: ${metadata.width}x${metadata.height} ${metadata.format} (${buffer.length} bytes)`
            );
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
                const thumbUrl = storage.getPublicUrl(variantKeys.thumb);
                await db
                    .update(users)
                    .set({ image: thumbUrl })
                    .where(eq(users.id, userId));
                console.log(`[ImageProcessing] Updated user ${userId} avatar to optimized thumb`);
            } else if (type === "logo") {
                console.log(`[ImageProcessing] Logo variants generated (manual URL update needed)`);
            }
        });

        return { key, type, variants: variantKeys };
    }
);

export const imageFunctions = [processImage];
