import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const isProd = process.env.USE_PROD_DB === 'true';

export default defineConfig({
    schema: "./db/schema.ts",
    out: "./db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: isProd ? process.env.DATABASE_URL_PROD! : process.env.DATABASE_URL!,
    },
    tablesFilter: ["!pg_stat_statements*", "!pg_buffercache*", "!pg_stat_monitor*"],
});
