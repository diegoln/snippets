# Optimized Production Dockerfile for AdvanceWeekly
# Multi-stage build with improved layer caching and development support

# ===== BASE STAGE =====
FROM node:18-slim AS base
WORKDIR /app

# Install system dependencies once (Debian packages)
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ===== BUILDER STAGE (simplified) =====
FROM base AS builder

# Copy package files for caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --frozen-lockfile --include=dev

# Copy source code
COPY . .

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Generate schema and build
RUN npm run generate-schema:force && npm run build
# Keep essential TypeScript dependencies for staging environment
# Staging uses NODE_ENV=staging which Next.js treats as needing TypeScript support
RUN npm prune --production && npm install --save @types/node typescript

# ===== DEVELOPMENT STAGE =====
FROM base as development

# Install dependencies for development
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

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
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

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