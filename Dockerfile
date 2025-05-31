# Multi-stage build for Next.js application
FROM node:18-alpine AS deps
WORKDIR /app

# Install corepack first for better layer caching
RUN npm install -g corepack && corepack enable

# Copy package files and yarn config
COPY package.json yarn.lock* .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies with optimizations
RUN yarn install --frozen-lockfile --check-cache --network-timeout 300000

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Setup corepack for yarn
RUN npm install -g corepack && corepack enable

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.yarnrc.yml ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/yarn.lock ./

# Copy source code
COPY . .

# Set build environment variables to avoid DB connection during build
ENV SKIP_ENV_VALIDATION=true
ENV MONGODB_URI="mongodb://placeholder:27017/placeholder"
ENV NEXT_PHASE="phase-production-build"

# Build the application
RUN yarn build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]