# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-slim AS builder
# Install OpenSSL (Debian 12 uses OpenSSL 3.0)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY . .

# Ensure public exists (repo may not have it or it may be empty)
RUN mkdir -p /app/public

# Generate Prisma Client
RUN npx prisma generate

# Set dummy DATABASE_URL for build (prevents Prisma from trying to connect during build)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-slim AS runner
# Install OpenSSL (Debian 12 uses OpenSSL 3.0)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# public: create empty dir here; real assets come from volume mount (./public) at runtime
RUN mkdir -p ./public

# Copy package.json so Prisma CLI can find it (requires from .bin resolve to node_modules/package.json and project root)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package.json ./node_modules/package.json

# Copy Prisma files (schema and migrations)
COPY --from=builder /app/prisma ./prisma

# Copy Prisma Client and CLI (needed for runtime and migrations)
# The prisma CLI wrapper looks for prisma_schema_build_bg.wasm in .bin/ so we copy it there too
RUN mkdir -p ./node_modules/.prisma ./node_modules/@prisma ./node_modules/prisma ./node_modules/.bin
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma/build/prisma_schema_build_bg.wasm ./node_modules/.bin/prisma_schema_build_bg.wasm

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations on startup, then start the app (so you never have to run migrate manually after deploy)
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && exec node server.js"]
