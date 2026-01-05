# Deployment Guide

## Overview

Docker-based deployment with GitHub Actions CI/CD pipeline for automated builds and SSH-based deployments to remote server. Application runs in isolated container with external MongoDB, Redis, and MinIO services.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│            GitHub Actions (CI/CD)                     │
│  - Triggered on push to main                         │
│  - Builds Docker image (multi-stage)                 │
│  - Transfers via SSH to production server            │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│         Production Server (/root/services/)          │
│  ┌────────────────────────────────────────────────┐  │
│  │  Portfolio Container (Docker)                  │  │
│  │  - Next.js 15 Standalone                       │  │
│  │  - Node.js 18 Alpine                           │  │
│  │  - Port 3000                                   │  │
│  │  - Non-root user (nextjs:1001)                 │  │
│  └──────────────┬─────────────────────────────────┘  │
└─────────────────┼────────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
   ┌─────────┬─────────┬──────────┐
   │ MongoDB │  Redis  │  MinIO   │
   │ (Ext.)  │ (Ext.)  │  (Ext.)  │
   └─────────┴─────────┴──────────┘
```

## Deployment Flow

### Complete Pipeline

**1. GitHub Actions Trigger**
- Push to `main` branch OR manual workflow dispatch
- Workflow file: `.github/workflows/deploy.yml`

**2. Build Stage (Multi-Stage Docker Build)**

**Stage 1: Dependencies (`deps`)**
```dockerfile
FROM node:18-alpine AS deps
- Install Corepack: npm install -g corepack && corepack enable
- Corepack installs Yarn v3.6.1 (reads from .yarnrc.yml)
- Copy: package.json, yarn.lock, .yarnrc.yml, .yarn/
- Install once: yarn install --frozen-lockfile
```

**Stage 2: Build (`builder`)**
```dockerfile
FROM node:18-alpine AS builder
- Install Corepack + Yarn again
- Copy node_modules from deps stage (NOT re-installed)
- Copy all source code
- Build: yarn build (creates .next/standalone)
```

**Stage 3: Production (`runner`)**
```dockerfile
FROM node:18-alpine AS runner
- Create non-root user nextjs (uid 1001)
- Copy only production files:
  - /public
  - .next/standalone
  - .next/static
- Set ownership to nextjs user
- Run: node server.js
```

**3. Artifact Preparation**
- Save built image as tarball
- Compress with gzip
- Create `.env` from GitHub Secrets

**4. SSH Transfer**
- Transfer to `/root/services/`:
  - `portfolio-image.tar.gz` (Docker image)
  - `docker-compose.yml`
  - `.env` file

**5. Remote Deployment**
- Stop existing container: `docker compose down`
- Load new image: `docker load < portfolio-image.tar.gz`
- Start container: `docker compose up -d`
- Health check: Wait for container + HTTP 200 on `localhost:3000`

**6. Verification**
- Container running check
- Application responding on port 3000
- Display running containers

## Key Files

**Deployment Configuration:**
- `.github/workflows/deploy.yml` - CI/CD pipeline
- `Dockerfile` - Multi-stage build definition
- `docker-compose.yml` - Container orchestration
- `.dockerignore` - Build exclusions

**Infrastructure:**
- `lib/mongodb.ts` - Database singleton connection
- `lib/redis.ts` - Session/cache management
- `lib/minio.ts` - S3-compatible storage client
- `instrumentation.ts` - Server startup hook (MongoDB init)

**Authentication:**
- `middleware.ts` - Edge-compatible JWT verification
- `app/admin/AdminGuard.tsx` - Server-side session validation
- `lib/auth/jwt-edge.ts` - JWT for Edge runtime (jose)
- `lib/auth/jwt-node.ts` - JWT for Node.js (jsonwebtoken)
- `scripts/setup-admin.ts` - Admin user creation CLI

## Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/portfolio

# Redis (Sessions & Rate Limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
# Optional: REDIS_PASSWORD, REDIS_DB

# MinIO (S3-Compatible Storage)
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_KEY=your-access-key
MINIO_SECRET=your-secret-key
MINIO_IMAGE_BUCKET=your-bucket-name

# JWT Authentication
JWT_ACCESS_SECRET=<openssl-rand-base64-32>
JWT_REFRESH_SECRET=<openssl-rand-base64-32>

# Optional
JWT_SECRET_VERSION=1              # For secret rotation
COOKIE_DOMAIN=example.com         # Explicit cookie domain
```

**Generate Secrets:**
```bash
openssl rand -base64 32   # For JWT secrets
```

**Create Admin User:**
```bash
yarn setup-admin  # Interactive CLI (not in .env)
```

## GitHub Actions Secrets

Required secrets in GitHub repository settings:

**Environment:**
- `MONGODB_URI`
- `REDIS_HOST`
- `REDIS_PORT`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_KEY`
- `MINIO_SECRET`
- `MINIO_IMAGE_BUCKET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

**SSH Deployment:**
- `SSH_PRIVATE_KEY` - Private key for server access
- `SSH_HOST` - Server hostname/IP
- `SSH_USER` - SSH username (typically 'root')

## Docker Configuration

### Multi-Stage Build Benefits

1. **Dependency Caching**: `deps` stage reused if package.json unchanged
2. **Build Optimization**: `builder` stage isolated from production
3. **Minimal Runtime**: Final image only contains compiled output
4. **Security**: Non-root user, minimal attack surface

### Dockerfile Features

- **Base**: Node.js 18 Alpine (minimal size)
- **Yarn**: Installed via Corepack (version from `.yarnrc.yml`)
- **Output**: Next.js standalone (optimized bundle)
- **Port**: 3000 (exposed)
- **User**: `nextjs` (uid 1001, non-root)

### docker-compose.yml

```yaml
services:
  portfolio:
    image: portfolio:latest
    container_name: portfolio
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - LOG_LEVEL=debug
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://0.0.0.0:3000/api/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Notes:**
- Container expects external MongoDB, Redis, MinIO
- `.env` file loaded from same directory
- Health check via `/api/ping` endpoint
- Auto-restart on failure

## Deployment Commands

### Manual Deployment

**Build Docker image:**
```bash
docker build -t portfolio:latest .
```

**Start with Docker Compose:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop container:**
```bash
docker-compose down
```

### Development

```bash
yarn install            # Install dependencies
yarn dev                # Start dev server (port 5005)
yarn build              # Build production bundle
yarn serve              # Start production server
yarn lint               # Lint code with auto-fix
yarn setup-admin        # Create admin user
```

## Security

**Authentication:**
- JWT tokens (access: 15min, refresh: 7 days)
- Redis-backed sessions with auto-expiry (TTL)
- IP-based rate limiting (5 attempts/15min, Redis + Lua scripts)
- Account lockout (5 failed attempts → 30min lock)
- bcrypt hashing (10 rounds) + semaphore DoS protection
- HTTP-only, secure, sameSite=strict cookies

**Container Security:**
- Non-root user (nextjs:1001)
- Edge-compatible JWT verification (jose library)
- Middleware protection for `/admin/*` routes
- Two-layer auth (Middleware + AdminGuard)

**Headers & CSRF:**
- CSP headers in `next.config.js`
- CSRF protection via cookie settings
- Security headers enabled

## Production Checklist

- [ ] Generate unique JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
- [ ] Create admin user via `yarn setup-admin` with strong password
- [ ] Configure SSL/HTTPS (required for secure cookies)
- [ ] Set up MongoDB backups and test restores
- [ ] Configure MinIO backup/replication policies
- [ ] Set up Redis persistence (AOF or RDB)
- [ ] Review CSP headers in `next.config.js`
- [ ] Add SSH key to GitHub Secrets
- [ ] Configure all environment variables in GitHub Secrets
- [ ] Test health check endpoint (`/api/ping`)
- [ ] Configure firewall rules for MongoDB, Redis, MinIO
- [ ] Test rate limiting and account lockout
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Set up monitoring (uptime, health checks, analytics)

## Performance

**Caching:**
- Static assets: Next.js automatic caching
- Sessions: Redis-backed with TTL expiry
- Rate limits: Redis counters with sliding windows
- API responses: Appropriate cache headers

**Bundle Optimization:**
```bash
yarn analyze  # Generate visual bundle report
```

**Connection Management:**
- MongoDB: Singleton connection pool (5-10 connections)
- Redis: Singleton client with auto-reconnect
- MinIO: Singleton client instance

## Monitoring

**Health Checks:**
- Docker healthcheck: `/api/ping` (30s interval)
- Application logs: `docker-compose logs -f`
- Container status: `docker ps | grep portfolio`

**Logs:**
```bash
# Docker logs
docker-compose logs -f

# Enable debug mode
LOG_LEVEL=debug  # In .env or docker-compose.yml
```

## Troubleshooting

### Build Issues

**Dependencies:**
```bash
# Clear build cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t portfolio:latest .
```

**TypeScript errors:**
- Build ignores TS errors (`ignoreBuildErrors: true` in `next.config.js`)
- Run `yarn typecheck` locally to find issues

### Database Connection

**MongoDB:**
- Verify `MONGODB_URI` format: `mongodb://host:27017/dbname`
- Check network connectivity from container
- Test connection: `docker exec portfolio node -e "require('./lib/mongodb')"`
- Review startup logs for connection errors

**Redis:**
- Test connection: `redis-cli -h <host> -p <port> ping`
- Check authentication if `REDIS_PASSWORD` set
- Ensure container can reach Redis host
- Verify port is open and accessible

### Authentication Issues

**JWT errors:**
- Verify `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set
- Ensure secrets are different from each other
- Check middleware errors in console logs

**Session not persisting:**
- Check Redis connection and TTL settings
- Verify cookies are set correctly (HTTP-only, secure)
- Ensure HTTPS in production (secure cookies require SSL)

**Rate limiting:**
- Verify Redis is accessible from container
- Check Redis logs for connection issues
- Test with `redis-cli` from same network

**Account lockout:**
- Check MongoDB for `failedLoginAttempts` and `accountLockedUntil`
- Wait 30 minutes or manually reset in database

### Image Uploads

**MinIO:**
- Verify credentials in `.env`
- Check bucket exists and permissions
- Test MinIO network access from container
- Review bucket policies in MinIO console

### Container Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs

# Inspect container
docker inspect portfolio

# Check if port 3000 is in use
lsof -i :3000
```

**Health check failing:**
- Verify `/api/ping` endpoint responds
- Check application logs for errors
- Ensure `wget` is available in container (Alpine includes it)

### SSH Deployment Issues

**SSH connection:**
- Verify `SSH_PRIVATE_KEY` is correct private key
- Check `SSH_HOST` is accessible
- Ensure `SSH_USER` has proper permissions
- Test manually: `ssh user@host`

**File transfer:**
- Check disk space on server: `df -h`
- Verify `/root/services/portfolio/` directory exists
- Check file permissions

## Recent Updates

**2025-10-21:**
- Updated deployment guide with complete pipeline documentation
- Added multi-stage build explanation
- Documented Yarn installation via Corepack
- Clarified dependency installation (1x install, not 2x)

---

**Dependencies:** Docker, Docker Compose, Node.js 18, MongoDB, Redis, MinIO, GitHub Actions
**Last Updated:** 2025-10-21
