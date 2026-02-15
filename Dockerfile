# ── Stage 1: Build ──────────────────────────────────────────
FROM node:24-slim AS build

WORKDIR /app

# Install build dependencies for native modules (argon2)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

RUN npm ci

# Copy source code
COPY . .

# Build with Railway adapter
ENV DEPLOY_TARGET=railway
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────
FROM node:24-slim AS runtime

WORKDIR /app

# Install runtime dependencies for native modules (argon2)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built output from build stage
COPY --from=build /app/dist ./dist

# Railway sets PORT automatically; @astrojs/node reads HOST and PORT
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Start the standalone Node.js server
CMD ["node", "dist/server/entry.mjs"]
