# Deployment Guide

## Prerequisites

- Node.js 18+ or Docker
- MongoDB instance (local/cloud)
- MinIO instance for image storage
- Domain name + SSL certificate (production)

## Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/portfolio

# MinIO Storage
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_KEY=your-access-key
MINIO_SECRET=your-secret-key
MINIO_IMAGE_BUCKET=your-bucket-name

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=<generate-with-node-scripts/generate-password-hash.js>
ADMIN_NAME=Admin User
```

**Important**: Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`

## Site Configuration

Update `data/siteMetadata.js`:

```javascript
{
  title: 'Your Name | Your Title',
  siteUrl: 'https://yourdomain.com',
  email: 'your@email.com',
  github: 'https://github.com/username',
  // ... other social links, analytics IDs
}
```

## Docker Deployment

### Docker Compose (Recommended)

```bash
docker-compose up -d        # Start
docker-compose logs -f      # View logs
docker-compose down         # Stop
```

### Manual Docker

```bash
docker build -t portfolio-app .
docker run -d -p 3000:3000 --env-file .env.local portfolio-app
```

## Manual Deployment

```bash
yarn install                # Install dependencies
yarn build                  # Build production bundle
yarn serve                  # Start production server
```

**Build notes**:

- TypeScript errors ignored in build (`ignoreBuildErrors: true`)
- Port: 5005 (dev), 3000 (production)
- Post-build script: `scripts/postbuild.mjs`

## Docker Configuration

### Dockerfile Architecture

- **Multi-stage build**: deps → builder → runner
- **Base**: Node 18 Alpine
- **Output**: Standalone Next.js (minimal size)
- **User**: Non-root `nextjs` user (uid 1001)
- **Port**: 3000

### docker-compose.yml

- Sets environment vars (NODE_ENV, PORT, HOSTNAME, LOG_LEVEL)
- Maps port 3000:3000
- Restart policy: unless-stopped
- Health check: `/api/ping` endpoint (30s interval)

**Note**: `.env` file must be provided separately (not mounted in docker-compose.yml)

## Security

- CSP headers configured in `next.config.js`
- CSRF protection via NextAuth
- Password hashing with bcrypt (10 rounds)
- httpOnly cookies for sessions
- Non-root Docker user
- **Session invalidation** on credential change (see `nextauth-integration.md`)

### Production Checklist

- [ ] Generate unique `NEXTAUTH_SECRET`
- [ ] Set strong admin password and hash
- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Configure SSL/HTTPS
- [ ] Set up MongoDB backups
- [ ] Configure MinIO backup/replication
- [ ] Review CSP headers
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Set up monitoring (analytics, uptime)

## Performance

### Image Optimization

- Next.js Image component with remote patterns
- Configure allowed domains in `next.config.js`
- Consider CDN for static assets

### Bundle Analysis

```bash
yarn analyze  # Generates visual bundle report
```

### Caching

- Static assets cached by Next.js automatically
- API responses: Use appropriate cache headers
- Consider Redis for session storage (optional)

## Monitoring

### Analytics

Add to `data/siteMetadata.js`:

```javascript
analytics: {
  googleAnalyticsId: 'G-XXXXXXXXXX',
}
```

### Backups

- **MongoDB**: Automated backups + test restores
- **MinIO**: Backup policies + cross-region replication

### Health Checks

- Docker healthcheck configured
- Monitor Core Web Vitals
- Track database/API performance
- Set up error tracking

## Troubleshooting

### Build failures

- Clear `.next` and rebuild
- Check dependencies: `yarn install`
- Run `yarn typecheck` for TS errors

### Database connection

- Verify `MONGODB_URI` format
- Check network connectivity
- Ensure MongoDB is running

### Image uploads

- Verify MinIO credentials
- Check bucket permissions/policies
- Test MinIO network access

### Auth issues

- Escape `$` in password hash: `\$2b\$10\$...`
- Restart server after `.env` changes
- Check middleware errors in console

### Logs

- Docker: `docker-compose logs -f`
- Enable debug: `NODE_ENV=development`

---

**Last Updated**: 2025-01-15
