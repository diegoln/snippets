# Production Dockerfile for AdvanceWeekly
# Multi-stage build for optimal image size and security

# Stage 1: Dependencies
FROM node:18-slim AS deps
WORKDIR /app

# Install system dependencies required for Prisma and native modules
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production --frozen-lockfile && npm cache clean --force

# Stage 2: Builder
FROM node:18-slim AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY scripts ./scripts/
RUN npm ci --frozen-lockfile

# Set build environment variables FIRST
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy source code
COPY . .

# Generate schema for production environment and Prisma client
RUN npm run generate-schema && npx prisma generate

# Build the application
# Note: Pages are configured with dynamic = 'force-dynamic' to avoid build-time DB issues
RUN npm run build

# Stage 3: Runtime
FROM node:18-slim AS runner
WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
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