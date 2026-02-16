// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

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
    plugins: [/** @type {any} */ (tailwindcss())]
  },

  adapter: node({ mode: 'standalone' }),

  // Disable Astro's built-in origin check for POST requests.
  // CSRF protection is handled by better-auth's trustedOrigins instead.
  security: {
    checkOrigin: false
  },

  image: {
    domains: ['hel1.your-objectstorage.com']
  }
});
