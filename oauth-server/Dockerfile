# Multi-stage Dockerfile for OAuth OIDC server
FROM node:22-alpine AS builder
WORKDIR /app

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package.json package-lock.json* ./

# Install all dependencies for build
RUN npm ci --legacy-peer-deps --silent

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built app and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Do NOT copy keys or .env files into the image. Mount them at runtime.
EXPOSE 4000
CMD ["node", "dist/main.js"]
