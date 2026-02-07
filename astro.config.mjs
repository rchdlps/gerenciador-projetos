// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

import sentry from "@sentry/astro";

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

  adapter: vercel({
    maxDuration: 60
  }),

  image: {
    domains: ['hel1.your-objectstorage.com']
  }
});