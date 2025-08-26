# Multi-stage build for University Bus Tracking System
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production && \
    cd frontend && npm ci --only=production && \
    cd ../backend && npm ci --only=production

# Build stage for frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist

# Copy backend
COPY --from=base --chown=nextjs:nodejs /app/backend ./backend
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy necessary files
COPY --chown=nextjs:nodejs backend/src ./backend/src
COPY --chown=nextjs:nodejs backend/tsconfig.json ./backend/
COPY --chown=nextjs:nodejs backend/env.local ./backend/

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/server.js"]
