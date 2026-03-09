# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl bash
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
FROM node:20-alpine AS runner
RUN apk add --no-cache bash openssl
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

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

# Run migrations on startup with retries, then start the app.
CMD ["/bin/sh", "-c", "attempt=1; until [ \"$attempt\" -gt 30 ]; do npx prisma migrate deploy && break; echo \"Prisma migrate deploy failed (attempt $attempt/30). Retrying in 2s...\"; attempt=$((attempt + 1)); sleep 2; done; if [ \"$attempt\" -gt 30 ]; then echo \"Prisma migrate deploy failed after 30 attempts.\"; exit 1; fi; exec node server.js"]
