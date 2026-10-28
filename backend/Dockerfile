# ==========================================
# Stage 1: Build stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for building TypeScript)
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src
COPY docs ./docs

# Build TypeScript to dist/
RUN npm run build

# ==========================================
# Stage 2: Production stage (Minimal runtime)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist
# Copy API documentation specifications
COPY --from=builder /app/docs ./docs

# Create necessary directories and set non-root user permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "dist/server.js"]
