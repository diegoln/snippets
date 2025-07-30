# Optimized Production Dockerfile for AdvanceWeekly
# Multi-stage build with improved layer caching and development support

# ===== BASE STAGE =====
FROM node:18-alpine AS base
WORKDIR /app

# Install system dependencies once (small Alpine packages)
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl \
    && rm -rf /var/cache/apk/*

# ===== DEPENDENCIES STAGE =====
FROM base AS deps

# Copy package files ONLY (for optimal Docker layer caching)
COPY package.json package-lock.json* ./

# Install ALL dependencies (dev + prod) for building
RUN npm ci --frozen-lockfile --include=dev && npm cache clean --force

# ===== PRISMA STAGE =====
FROM base AS prisma

# Copy only what's needed for Prisma generation
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY scripts/generate-schema.js ./scripts/

# Generate Prisma client (this layer caches well)
ENV NODE_ENV=production
RUN npm run generate-schema && npx prisma generate

# ===== BUILDER STAGE =====
FROM base AS builder

# Copy dependencies and generated Prisma client  
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/prisma ./prisma

# Set build environment variables BEFORE copying source
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy source code (this layer changes most frequently)
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies to reduce final image size
RUN npm prune --production

# ===== DEVELOPMENT STAGE =====
FROM base as development

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source and development files
COPY . .

# Development environment
ENV NODE_ENV=development
EXPOSE 3000

# Development command
CMD ["npm", "run", "dev"]

# ===== PRODUCTION RUNTIME STAGE =====
FROM base AS production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy production node_modules (pruned)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application and necessary files
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy startup scripts
COPY --chown=nextjs:nodejs custom-server.js ./
COPY --chown=nextjs:nodejs start.sh ./
RUN chmod +x start.sh

# Switch to non-root user
USER nextjs

# Configure runtime environment
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application
CMD ["./start.sh"]