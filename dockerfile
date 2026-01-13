# Stage 1: Build the NestJS application
FROM node:20-bullseye AS builder

# Set working directory
WORKDIR /app

# Install PNPM globally
RUN npm install -g pnpm

# Install system dependencies for canvas and fonts (NO wkhtmltopdf)
RUN apt-get update && apt-get install -y \
    fontconfig \
    fonts-dejavu \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-bin \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the NestJS app
RUN pnpm build

# Verify build output
RUN ls -la dist/src && test -f dist/src/main.js || (echo "Build failed: dist/src/main.js not found" && exit 1)

# Verify assets
RUN ls -la dist/src/assets/fonts \
 && test -f dist/src/assets/fonts/AvenirNext-Regular.ttf \
 || (echo "Fonts not copied to dist" && exit 1)

# Verify templates
RUN test -d dist/src/templates \
 && [ "$(ls -A dist/src/templates)" ] \
 || (echo "Templates not copied to dist/src/templates" && exit 1)


# Stage 2: Run the NestJS application
FROM node:20-bullseye AS runner

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install PNPM
RUN npm install -g pnpm

# Install runtime dependencies for canvas and fonts (NO wkhtmltopdf)
RUN apt-get update && apt-get install -y \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    fonts-freefont-ttf \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-bin \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

# Copy required files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Verify runtime files
RUN ls -la /app/dist/src \
 && test -f /app/dist/src/main.js \
 || (echo "Copy failed: /app/dist/src/main.js not found" && exit 1)

RUN ls -la /app/dist/src/assets/fonts \
 && test -f /app/dist/src/assets/fonts/AvenirNext-Regular.ttf \
 || (echo "Font copy failed" && exit 1)

# Expose port
EXPOSE 3002

# Start the application
CMD ["pnpm", "start:prod"]
