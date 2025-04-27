# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Install glob specifically for build.js
RUN npm install -D glob

# Copy source files
COPY . .

# Run the build script
RUN node build.js

# Ensure migrations folder exists in dist
RUN mkdir -p dist/migrations
RUN cp src/migrations/*.sql dist/migrations/

# Stage 2: Run
FROM node:18-alpine
WORKDIR /app

# Copy only production dependencies and built code
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/events || exit 1

# Expose port and run
EXPOSE 3000
CMD ["node", "dist/app.js"]
