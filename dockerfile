# Stage 1: Build the NestJS application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install PNPM globally
RUN npm install -g pnpm

# Install system dependencies for canvas and fonts
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    fontconfig \
    freetype-dev \
    ttf-freefont

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application (including assets)
COPY . .

# Build the NestJS app
RUN pnpm build

# Verify that dist/src/main.js exists
RUN ls -la dist/src && test -f dist/src/main.js || (echo "Build failed: dist/src/main.js not found" && exit 1)

# Verify assets were copied
RUN ls -la dist/src/assets/fonts && test -f dist/src/assets/fonts/AvenirNext-Regular.ttf || (echo "Fonts not copied to dist" && exit 1)

# Stage 2: Run the NestJS application
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install PNPM in the runtime stage
RUN npm install -g pnpm

# Install runtime dependencies for canvas and fonts
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    librsvg \
    fontconfig \
    freetype \
    ttf-freefont

# Copy necessary files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Verify copied files
RUN ls -la /app/dist/src && test -f /app/dist/src/main.js || (echo "Copy failed: /app/dist/src/main.js not found" && exit 1)
RUN ls -la /app/dist/src/assets/fonts && test -f /app/dist/src/assets/fonts/AvenirNext-Regular.ttf || (echo "Font copy failed" && exit 1)

# Expose the port
EXPOSE 3002

# Start the application using the start:prod script
CMD ["pnpm", "start:prod"]