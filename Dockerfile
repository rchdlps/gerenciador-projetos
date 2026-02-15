# ── Stage 1: Build ──────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

# Update npm and install build dependencies for native modules (argon2)
RUN npm install -g npm@latest && \
    apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Skip install scripts to avoid broken esbuild validation in deprecated @esbuild-kit/core-utils,
# then rebuild argon2 native module separately
RUN npm ci --ignore-scripts && npm rebuild argon2

# Copy source code
COPY . .

# Build with Railway adapter
ENV DEPLOY_TARGET=railway
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

# Update npm and install runtime dependencies for native modules (argon2)
RUN npm install -g npm@latest && \
    apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild argon2

# Copy built output from build stage
COPY --from=build /app/dist ./dist

# Railway sets PORT automatically; @astrojs/node reads HOST and PORT
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Start the standalone Node.js server
CMD ["node", "dist/server/entry.mjs"]
