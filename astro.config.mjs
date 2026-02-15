// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

import sentry from "@sentry/astro";

const isRailway = process.env.DEPLOY_TARGET === 'railway';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    sentry({
      project: "javascript-astro",
      org: "dexatec",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: isRailway
    ? node({ mode: 'standalone' })
    : vercel({ maxDuration: 60 }),

  image: {
    domains: ['hel1.your-objectstorage.com']
  }
});
