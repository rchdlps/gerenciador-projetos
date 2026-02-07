import * as Sentry from "@sentry/astro";

Sentry.init({
    dsn: "https://3b14044261b5cfb38ecd3108ca89362f@o4510846954110976.ingest.us.sentry.io/4510846956077056",
    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
});