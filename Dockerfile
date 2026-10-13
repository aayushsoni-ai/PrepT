# ─── MULTI-STAGE PRODUCTION DOCKERFILE FOR NEXT.JS (PREPT) ───────────────────
# Optimized with Alpine Linux & Standalone output (~180MB minimal image)

# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Stage 2: Dependencies installation
FROM base AS deps
WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install exact dependencies
RUN npm ci

# Generate Prisma Client for Linux Alpine
RUN npx prisma generate

# Stage 3: Builder
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js standalone application
RUN npm run build

# Stage 4: Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone bundle from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
