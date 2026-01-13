# Stage 1: Build the NestJS application
FROM node:20-bullseye AS builder

WORKDIR /app

# Install PNPM
RUN npm install -g pnpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wkhtmltopdf \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm build

# Stage 2: Production
FROM node:20-bullseye-slim

WORKDIR /app

ENV NODE_ENV=production
ENV WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf

# Install only essential dependencies
RUN apt-get update && apt-get install -y \
    wkhtmltopdf \
    ca-certificates \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fonts-urw-base35 \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

# Copy built app from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3002

CMD ["node", "dist/src/main.js"]