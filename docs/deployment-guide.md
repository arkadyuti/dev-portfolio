# Deployment Guide

This document provides comprehensive instructions for deploying the portfolio application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Production Build](#production-build)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

Before deployment, ensure you have:

- Node.js 18+ or Docker
- MongoDB instance (local or cloud)
- MinIO instance for file storage
- Domain name (for production)
- SSL certificate (recommended)

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/portfolio

# MinIO Storage
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket-name

# Site Configuration
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-key
```

### Site Metadata Configuration

Update `data/siteMetadata.js` with your information:

```javascript
const siteMetadata = {
  title: 'Your Name | Your Title',
  author: 'Your Name',
  description: 'Your professional description',
  siteUrl: 'https://yourdomain.com',
  email: 'your-email@domain.com',
  github: 'https://github.com/yourusername',
  linkedin: 'https://linkedin.com/in/yourprofile',
  // ... other social links
}
```

## Docker Deployment

### Using Docker Compose

The application includes Docker configuration for easy deployment:

```bash
# Start the application with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Custom Docker Build

```bash
# Build the Docker image
docker build -t portfolio-app .

# Run the container
docker run -d \
  --name portfolio \
  -p 3000:3000 \
  --env-file .env.local \
  portfolio-app
```

## Production Build

### Manual Deployment

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Build the application:**
   ```bash
   yarn build
   ```

3. **Start the production server:**
   ```bash
   yarn serve
   ```

### Build Configuration

The build process includes:

- TypeScript compilation with strict checks disabled for faster builds
- Next.js optimizations and bundling
- Post-build asset optimization via `scripts/postbuild.mjs`

## Performance Optimization

### Image Optimization

- Configure remote patterns in `next.config.js` for your image domains
- Use Next.js Image component for automatic optimization
- Consider using a CDN for static assets

### Bundle Analysis

Analyze your bundle size:

```bash
yarn analyze
```

This generates a visual report of your bundle composition.

### Caching Strategy

- Static assets are automatically cached by Next.js
- API responses can be cached using appropriate headers
- Consider implementing Redis for session storage in production

## Monitoring and Maintenance

### Analytics Setup

1. Add your Google Analytics ID to `data/siteMetadata.js`:
   ```javascript
   analytics: {
     googleAnalyticsId: 'G-XXXXXXXXXX',
   }
   ```

### Backup Strategy

1. **Database Backups:**
   - Set up automated MongoDB backups
   - Test restore procedures regularly

2. **Image Storage Backups:**
   - Configure MinIO backup policies
   - Consider cross-region replication

### Security Considerations

- Keep dependencies updated: `yarn upgrade`
- Monitor security vulnerabilities: `yarn audit`
- Review and update CSP headers in `next.config.js`
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Regularly rotate secret keys

### Performance Monitoring

- Monitor Core Web Vitals
- Set up error tracking (e.g., Sentry)
- Monitor server response times
- Track database performance

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check TypeScript errors: `yarn build` without NEXT_DISABLE_TYPE_CHECKS
   - Verify all dependencies are installed
   - Clear `.next` directory and rebuild

2. **Database Connection Issues:**
   - Verify MongoDB URI and credentials
   - Check network connectivity
   - Ensure database is running

3. **Image Upload Issues:**
   - Verify MinIO configuration and credentials
   - Check bucket permissions
   - Ensure proper network access to MinIO

### Logs and Debugging

- Application logs are available via `docker-compose logs`
- Enable debug mode by setting `NODE_ENV=development`
- Check browser console for client-side errors