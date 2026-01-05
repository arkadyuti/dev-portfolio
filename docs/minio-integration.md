# MinIO Integration Guide

## Overview

**MinIO** is a high-performance, S3-compatible object storage solution perfect for managing file assets in modern web applications. This guide provides a comprehensive walkthrough for integrating MinIO into any Node.js/TypeScript project, with practical examples for image storage, file uploads, and asset management.

## Table of Contents

- [What is MinIO?](#what-is-minio)
- [Getting Started](#getting-started)
- [Installation & Setup](#installation--setup)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Implementation Guide](#implementation-guide)
- [Image Upload Workflow](#image-upload-workflow)
- [Security & Best Practices](#security--best-practices)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## What is MinIO?

**MinIO** is a high-performance, S3-compatible object storage system designed for large-scale AI/ML, data lake, and database workloads. It's:

- **S3-Compatible**: Uses the same API as Amazon S3
- **Self-Hosted**: Run on your own infrastructure
- **High Performance**: Built for speed and scalability
- **Open Source**: Free and community-driven
- **Cloud-Native**: Kubernetes-native architecture

### Why Choose MinIO?

1. **Cost-Effective**: No cloud storage fees - host on your own servers
2. **Full Control**: Complete ownership of data and infrastructure
3. **S3 Compatibility**: Easy migration to/from AWS S3 if needed
4. **Performance**: Low-latency access with high throughput
5. **Simplicity**: Easy to deploy with Docker or Kubernetes
6. **Scalability**: Start small, scale to petabytes
7. **Multi-Cloud**: Works on any infrastructure (on-prem, cloud, hybrid)

### Use Cases

- **Media Storage**: Images, videos, audio files
- **Document Management**: PDFs, spreadsheets, presentations
- **Backup & Archive**: Database backups, log files
- **Data Lakes**: Analytics and ML training data
- **Static Assets**: CDN origin for web applications

---

## Getting Started

### Prerequisites

- Node.js 18+ or compatible runtime
- MinIO server (local or remote)
- Basic understanding of async/await and Promises
- (Optional) TypeScript for type safety

### Quick Start

1. **Install MinIO Server** (choose one):

```bash
# Docker (recommended for development)
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"

# macOS (Homebrew)
brew install minio/stable/minio
minio server /data

# Linux (Binary)
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
./minio server /data
```

2. **Access MinIO Console**: Open `http://localhost:9001` (default credentials: minioadmin/minioadmin)

3. **Create a Bucket**: Use the web console or CLI to create your first bucket

---

## Installation & Setup

### 1. Install Dependencies

```bash
# Core MinIO client
npm install minio

# TypeScript types (if using TypeScript)
npm install --save-dev @types/minio

# Optional: Image processing
npm install sharp

# Optional: Unique ID generation
npm install uuid
npm install --save-dev @types/uuid
```

### 2. Environment Configuration

Create a `.env` file:

```bash
# MinIO Server Configuration
MINIO_ENDPOINT=localhost              # MinIO server hostname
MINIO_PORT=9000                       # MinIO server port (default: 9000)
MINIO_USE_SSL=false                   # Use HTTPS (true/false)

# MinIO Credentials
MINIO_ACCESS_KEY=minioadmin           # Access key (like AWS_ACCESS_KEY_ID)
MINIO_SECRET_KEY=minioadmin           # Secret key (like AWS_SECRET_ACCESS_KEY)

# Bucket Configuration
MINIO_BUCKET=my-app-files             # Default bucket name
```

**Production Example**:
```bash
MINIO_ENDPOINT=minio.yourdomain.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your-secure-access-key
MINIO_SECRET_KEY=your-secure-secret-key
MINIO_BUCKET=production-assets
```

### 3. Load Environment Variables

```javascript
// Using dotenv
require('dotenv').config()

// Or in Next.js - automatic in next.config.js
```

---

## Technology Stack

### Core Dependencies

```json
{
  "minio": "^8.0.5"         // MinIO JavaScript SDK (required)
}
```

### Optional Dependencies

```json
{
  "sharp": "^0.34.2",       // Image processing (resize, compress, optimize)
  "uuid": "^11.1.0",        // Unique filename generation
  "dotenv": "^16.0.0"       // Environment variable management
}
```

### Framework Compatibility

MinIO works with any Node.js framework:
- **Next.js**: API Routes, Server Actions, App Router
- **Express**: REST APIs, middleware
- **Fastify**: High-performance APIs
- **NestJS**: Enterprise applications
- **Serverless**: AWS Lambda, Vercel Functions, Netlify Functions

---

## Architecture Patterns

### Basic Architecture

```
┌─────────────────┐
│   Client/UI     │
│  (Web/Mobile)   │
└────────┬────────┘
         │ HTTP Request (multipart/form-data)
         ▼
┌─────────────────────────────────────────┐
│      Application Server                 │
│  (Express, Next.js, etc.)               │
│  - Receive file upload                  │
│  - Validate file                        │
│  - Process (optional)                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     MinIO Client Module                 │
│  - Initialize client                    │
│  - Upload file                          │
│  - Generate URLs                        │
│  - Manage permissions                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│      MinIO Server                       │
│  (S3-Compatible Object Storage)         │
│  - Store files                          │
│  - Serve files                          │
│  - Manage buckets                       │
└─────────────────────────────────────────┘
```

### Recommended Bucket Structure

```
my-app-bucket/
├── uploads/                 # User uploads
│   ├── images/
│   │   └── {userId}/{filename}
│   ├── documents/
│   │   └── {userId}/{filename}
│   └── videos/
│       └── {userId}/{filename}
├── temp/                    # Temporary files (auto-cleanup)
│   └── {sessionId}/{filename}
├── public/                  # Public assets
│   ├── avatars/
│   └── thumbnails/
└── private/                 # Private files (presigned URLs)
    └── {userId}/{filename}
```

---

## Implementation Guide

### Step 1: Create MinIO Client Module

Create a reusable MinIO client with proper error handling and lazy initialization.

**File**: `lib/minio.js` or `lib/minio.ts`

```typescript
import * as Minio from 'minio'

// Singleton client instance
let minioClient: Minio.Client | null = null
let initializationAttempted = false

/**
 * Get or initialize MinIO client
 * Lazy loading prevents build-time initialization issues
 */
export function getMinioClient(): Minio.Client {
  if (!initializationAttempted) {
    initializationAttempted = true

    // Validate required environment variables
    if (!process.env.MINIO_ENDPOINT) {
      throw new Error('MINIO_ENDPOINT is required')
    }

    try {
      minioClient = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT,
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      })

      console.log('✅ MinIO client initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize MinIO client:', error)
      throw error
    }
  }

  if (!minioClient) {
    throw new Error('MinIO client not initialized')
  }

  return minioClient
}

/**
 * Ensure bucket exists, create if it doesn't
 */
export async function ensureBucket(bucketName: string): Promise<void> {
  const client = getMinioClient()

  try {
    const exists = await client.bucketExists(bucketName)

    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1')
      console.log(`✅ Created bucket: ${bucketName}`)
    }
  } catch (error: any) {
    // Handle specific errors
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to MinIO at ${process.env.MINIO_ENDPOINT}`)
    }
    if (error.code === 'InvalidAccessKeyId') {
      throw new Error('Invalid MinIO credentials')
    }
    throw error
  }
}

/**
 * Upload file to MinIO
 */
export async function uploadFile(
  bucketName: string,
  fileName: string,
  buffer: Buffer,
  metadata: Record<string, string> = {}
): Promise<void> {
  await ensureBucket(bucketName)

  const client = getMinioClient()

  await client.putObject(
    bucketName,
    fileName,
    buffer,
    buffer.length,
    metadata
  )

  console.log(`✅ Uploaded: ${fileName} to ${bucketName}`)
}

/**
 * Delete file from MinIO
 */
export async function deleteFile(
  bucketName: string,
  fileName: string
): Promise<void> {
  const client = getMinioClient()
  await client.removeObject(bucketName, fileName)
  console.log(`🗑️  Deleted: ${fileName} from ${bucketName}`)
}

/**
 * Generate public URL for file
 */
export function getPublicUrl(
  bucketName: string,
  fileName: string
): string {
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'
  const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : ''
  return `${protocol}://${process.env.MINIO_ENDPOINT}${port}/${bucketName}/${fileName}`
}

/**
 * Generate presigned URL (temporary access)
 */
export async function getPresignedUrl(
  bucketName: string,
  fileName: string,
  expirySeconds: number = 3600 // 1 hour default
): Promise<string> {
  const client = getMinioClient()
  return await client.presignedGetObject(bucketName, fileName, expirySeconds)
}

/**
 * Make file publicly accessible
 */
export async function makeFilePublic(
  bucketName: string,
  fileName: string
): Promise<void> {
  const client = getMinioClient()

  // S3-compatible bucket policy for public read
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${bucketName}/${fileName}`]
    }]
  }

  try {
    await client.setBucketPolicy(bucketName, JSON.stringify(policy))
  } catch (error) {
    console.warn('Could not set bucket policy:', error)
    // Some MinIO configurations don't support policies
  }
}
```

### Step 2: Create Upload Handler (Express Example)

**File**: `routes/upload.js`

```javascript
import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { uploadFile, getPublicUrl } from '../lib/minio.js'

const router = express.Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop()
    const fileName = `uploads/${uuidv4()}.${fileExtension}`
    const bucketName = process.env.MINIO_BUCKET || 'my-app-files'

    // Upload to MinIO
    await uploadFile(bucketName, fileName, req.file.buffer, {
      'Content-Type': req.file.mimetype,
      'Original-Name': req.file.originalname,
      'Upload-Date': new Date().toISOString()
    })

    // Get public URL
    const fileUrl = getPublicUrl(bucketName, fileName)

    res.json({
      success: true,
      url: fileUrl,
      fileName,
      size: req.file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
})

export default router
```

### Step 3: Create Upload Handler (Next.js Example)

**File**: `app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { uploadFile, getPublicUrl } from '@/lib/minio'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `uploads/${uuidv4()}.${fileExtension}`
    const bucketName = process.env.MINIO_BUCKET || 'my-app-files'

    // Upload to MinIO
    await uploadFile(bucketName, fileName, buffer, {
      'Content-Type': file.type,
      'Original-Name': file.name,
      'Upload-Date': new Date().toISOString()
    })

    // Get public URL
    const fileUrl = getPublicUrl(bucketName, fileName)

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName,
      size: file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
```

### Step 4: Frontend Upload Component (React)

**File**: `components/FileUpload.tsx`

```typescript
import { useState } from 'react'

export default function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setFileUrl(data.url)
        console.log('File uploaded:', data.url)
      } else {
        alert('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {fileUrl && (
        <div>
          <p>File uploaded successfully!</p>
          <img src={fileUrl} alt="Uploaded" style={{ maxWidth: '300px' }} />
        </div>
      )}
    </div>
  )
}
```

### Step 5: Optional - Image Processing

If you want to optimize images before upload, install Sharp:

```bash
npm install sharp
```

**File**: `lib/image-processor.ts`

```typescript
import sharp from 'sharp'

export async function processImage(
  buffer: Buffer,
  options: {
    maxWidth?: number
    quality?: number
  } = {}
): Promise<Buffer> {
  const { maxWidth = 1200, quality = 80 } = options

  try {
    const metadata = await sharp(buffer).metadata()

    let processor = sharp(buffer)

    // Resize if needed
    if (maxWidth && metadata.width && metadata.width > maxWidth) {
      processor = processor.resize({
        width: maxWidth,
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    // Optimize based on format
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      return await processor.jpeg({ quality }).toBuffer()
    } else if (metadata.format === 'png') {
      return await processor.png({ compressionLevel: 9 }).toBuffer()
    } else if (metadata.format === 'webp') {
      return await processor.webp({ quality }).toBuffer()
    }

    return buffer
  } catch (error) {
    console.error('Image processing error:', error)
    return buffer // Return original on error
  }
}
```

Then use it in your upload handler:

```typescript
import { processImage } from '@/lib/image-processor'

// In your upload handler
const processedBuffer = await processImage(buffer, {
  maxWidth: 1200,
  quality: 80
})

await uploadFile(bucketName, fileName, processedBuffer, metadata)
```

---

## Image Upload Workflow

### Simple Upload Flow

```
1. User selects file
   ↓
2. Frontend sends FormData to API
   ↓
3. API receives file
   ↓
4. Convert to Buffer
   ↓
5. (Optional) Process with Sharp
   ↓
6. Upload to MinIO
   ↓
7. Return public URL
   ↓
8. Frontend displays image
```

### Advanced: Temp-to-Final Workflow

For applications that need validation before permanent storage:

```
1. Upload to temp/ directory
   ↓
2. Return temp URL for preview
   ↓
3. User validates/edits
   ↓
4. Save to database
   ↓
5. Move from temp/ to final/ directory
   ↓
6. Update database with final URL
   ↓
7. Delete temp file
```

**Implementation**:

```typescript
// Step 1: Upload to temp
async function uploadTemp(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const tempName = `temp/${uuidv4()}.${file.name.split('.').pop()}`

  await uploadFile('my-bucket', tempName, buffer)
  return { tempName, url: getPublicUrl('my-bucket', tempName) }
}

// Step 2: Move to final location
async function moveToFinal(tempName: string, entityId: string) {
  const client = getMinioClient()

  // Download temp file
  const stream = await client.getObject('my-bucket', tempName)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  // Upload to final location
  const finalName = `uploads/${entityId}/${Date.now()}.jpg`
  await uploadFile('my-bucket', finalName, buffer)

  // Delete temp file
  await deleteFile('my-bucket', tempName)

  return getPublicUrl('my-bucket', finalName)
}
```

---

## Security & Best Practices

### 1. Environment Variables

✅ **Never hardcode credentials**

```typescript
// ❌ Bad
const client = new Minio.Client({
  endPoint: 'minio.example.com',
  accessKey: 'my-access-key',  // Never do this!
  secretKey: 'my-secret-key'
})

// ✅ Good
const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!
})
```

### 2. File Validation

✅ **Validate file types and sizes**

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function validateFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File too large')
  }
}
```

### 3. Unique Filenames

✅ **Prevent filename collisions**

```typescript
import { v4 as uuidv4 } from 'uuid'

// ❌ Bad - can overwrite existing files
const fileName = file.name

// ✅ Good - guaranteed unique
const fileName = `${uuidv4()}.${file.name.split('.').pop()}`

// ✅ Better - organized by date
const date = new Date().toISOString().split('T')[0]
const fileName = `${date}/${uuidv4()}.jpg`
```

### 4. Error Handling

✅ **Handle errors gracefully**

```typescript
try {
  await uploadFile(bucket, fileName, buffer)
} catch (error: any) {
  if (error.code === 'ECONNREFUSED') {
    console.error('MinIO server is not running')
  } else if (error.code === 'InvalidAccessKeyId') {
    console.error('Invalid credentials')
  } else {
    console.error('Upload failed:', error.message)
  }
  throw error
}
```

### 5. Metadata Tracking

✅ **Add useful metadata**

```typescript
await uploadFile(bucket, fileName, buffer, {
  'Content-Type': file.type,
  'Original-Name': file.name,
  'Upload-Date': new Date().toISOString(),
  'User-Id': userId,
  'File-Size': buffer.length.toString()
})
```

### 6. Cleanup Old Files

✅ **Delete replaced files**

```typescript
async function updateUserAvatar(userId: string, newFile: File) {
  // Get old avatar path from database
  const oldAvatar = await db.users.findOne({ id: userId })

  // Upload new avatar
  const newPath = `avatars/${userId}.jpg`
  await uploadFile('my-bucket', newPath, buffer)

  // Delete old avatar if it exists
  if (oldAvatar?.avatarPath) {
    await deleteFile('my-bucket', oldAvatar.avatarPath)
  }

  // Update database
  await db.users.update({ id: userId }, { avatarPath: newPath })
}
```

### 7. Use Presigned URLs for Private Files

✅ **Temporary access to private files**

```typescript
// Generate URL that expires in 1 hour
const url = await getPresignedUrl('private-bucket', 'document.pdf', 3600)

// Send to client
res.json({ downloadUrl: url })
```

### 8. Bucket Organization

✅ **Organize files logically**

```typescript
// By user
`users/${userId}/avatar.jpg`
`users/${userId}/documents/${docId}.pdf`

// By date
`uploads/2025/10/16/${uuid}.jpg`

// By type
`images/products/${productId}.jpg`
`videos/tutorials/${videoId}.mp4`
```

---

## Deployment

### Docker Deployment

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  minio:
    image: quay.io/minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console
    environment:
      MINIO_ROOT_USER: your-access-key
      MINIO_ROOT_PASSWORD: your-secret-key
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_USE_SSL: false
      MINIO_ACCESS_KEY: your-access-key
      MINIO_SECRET_KEY: your-secret-key
      MINIO_BUCKET: my-app-files
    depends_on:
      - minio

volumes:
  minio-data:
```

### Production Deployment

**Nginx Reverse Proxy** (for SSL termination):

```nginx
server {
    listen 443 ssl;
    server_name minio.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API
    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Large file uploads
        client_max_body_size 100M;
    }
}
```

### Environment-Specific Configuration

```typescript
// config/minio.ts
export const minioConfig = {
  development: {
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
  },
  production: {
    endPoint: process.env.MINIO_ENDPOINT!,
    port: parseInt(process.env.MINIO_PORT || '443'),
    useSSL: true,
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!
  }
}

const env = process.env.NODE_ENV || 'development'
export default minioConfig[env]
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Error**: `ECONNREFUSED` or `Network error`

**Solutions**:
- Verify MinIO server is running: `docker ps` or `systemctl status minio`
- Check `MINIO_ENDPOINT` and `MINIO_PORT` are correct
- Test connection: `curl http://localhost:9000/minio/health/live`
- Check firewall rules

#### 2. Access Denied

**Error**: `AccessDenied` or `InvalidAccessKeyId`

**Solutions**:
- Verify credentials in `.env` file
- Check MinIO console: http://localhost:9001
- Ensure access key has proper permissions
- Try default credentials: minioadmin/minioadmin (dev only)

#### 3. Bucket Not Found

**Error**: `NoSuchBucket`

**Solutions**:
- Use `ensureBucket()` to auto-create buckets
- Create bucket manually in MinIO console
- Check bucket name spelling

#### 4. Files Not Accessible

**Error**: 403 Forbidden or files won't load

**Solutions**:
- Make files public: `makeFilePublic(bucket, fileName)`
- Set bucket policy for public read access
- Check CORS settings in MinIO
- Verify URL format: `http://endpoint:port/bucket/file`

#### 5. SSL/TLS Errors

**Error**: `EPROTO` or certificate errors

**Solutions**:
- Set `useSSL: false` for local development
- Use valid SSL certificates in production
- Configure `MINIO_USE_SSL` environment variable
- Check certificate chain

#### 6. Large File Uploads Fail

**Error**: Timeout or connection reset

**Solutions**:
- Increase server timeout settings
- Configure Nginx `client_max_body_size`
- Use multipart uploads for files > 5MB
- Implement upload progress tracking

### Debug Mode

Enable detailed logging:

```typescript
import { getMinioClient } from './lib/minio'

const client = getMinioClient()

// Enable trace logging (development only)
if (process.env.NODE_ENV === 'development') {
  client.traceOn(process.stdout)
}
```

---

## Advanced Features

### 1. Multipart Uploads (Large Files)

```typescript
async function uploadLargeFile(
  bucketName: string,
  fileName: string,
  filePath: string
) {
  const client = getMinioClient()

  // MinIO automatically handles multipart for large files
  await client.fPutObject(bucketName, fileName, filePath, {
    'Content-Type': 'application/octet-stream'
  })
}
```

### 2. Bucket Lifecycle Policies

Auto-delete old files:

```typescript
async function setLifecyclePolicy(bucketName: string) {
  const client = getMinioClient()

  const lifecycleConfig = {
    Rule: [{
      ID: 'DeleteOldTempFiles',
      Status: 'Enabled',
      Prefix: 'temp/',
      Expiration: {
        Days: 1  // Delete after 1 day
      }
    }]
  }

  await client.setBucketLifecycle(bucketName, lifecycleConfig)
}
```

### 3. CORS Configuration

Allow browser uploads:

```typescript
async function configureCORS(bucketName: string) {
  const client = getMinioClient()

  const corsConfig = {
    CORSRule: [{
      AllowedOrigin: ['https://yourdomain.com'],
      AllowedMethod: ['GET', 'PUT', 'POST', 'DELETE'],
      AllowedHeader: ['*'],
      MaxAgeSeconds: 3000
    }]
  }

  await client.setBucketCors(bucketName, corsConfig)
}
```

### 4. Event Notifications

Get notified on file uploads:

```typescript
async function setupNotifications(bucketName: string) {
  const client = getMinioClient()

  const listener = client.listenBucketNotification(
    bucketName,
    'uploads/',
    '',
    ['s3:ObjectCreated:*']
  )

  listener.on('notification', (record) => {
    console.log('New file uploaded:', record.s3.object.key)
    // Process the uploaded file
  })
}
```

---

## Performance Optimization

### 1. Connection Pooling

Reuse MinIO client instance:

```typescript
// ✅ Good - singleton pattern
let client: Minio.Client | null = null

export function getMinioClient() {
  if (!client) {
    client = new Minio.Client({ /* config */ })
  }
  return client
}

// ❌ Bad - creates new connection each time
export function getMinioClient() {
  return new Minio.Client({ /* config */ })
}
```

### 2. Parallel Uploads

Upload multiple files concurrently:

```typescript
async function uploadMultiple(files: File[]) {
  const uploads = files.map(file =>
    uploadFile('my-bucket', file.name, buffer)
  )

  await Promise.all(uploads)
}
```

### 3. Streaming Large Files

Avoid loading entire file into memory:

```typescript
import fs from 'fs'

async function streamUpload(filePath: string) {
  const client = getMinioClient()
  const stream = fs.createReadStream(filePath)

  await client.putObject('my-bucket', 'large-file.zip', stream)
}
```

---

## Migration from AWS S3

MinIO is S3-compatible, making migration straightforward:

```typescript
// AWS S3 code
import AWS from 'aws-sdk'
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
})

// MinIO equivalent
import * as Minio from 'minio'
const minio = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
})

// Most S3 operations work the same way!
```

---

## References & Resources

### Official Documentation
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [MinIO JavaScript SDK](https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html)
- [S3 API Compatibility](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)

### Tools & Libraries
- [Sharp (Image Processing)](https://sharp.pixelplumbing.com/)
- [Multer (File Uploads)](https://github.com/expressjs/multer)
- [MinIO Client (CLI)](https://min.io/docs/minio/linux/reference/minio-mc.html)

### Community
- [MinIO GitHub](https://github.com/minio/minio)
- [MinIO Slack](https://slack.min.io/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/minio)

---

## Example Project Structure

```
my-app/
├── lib/
│   ├── minio.ts              # MinIO client & utilities
│   └── image-processor.ts    # Image optimization
├── routes/
│   └── upload.ts             # Upload endpoints
├── components/
│   └── FileUpload.tsx        # Upload UI
├── .env                      # Environment variables
├── docker-compose.yml        # MinIO + app setup
└── package.json
```

---

## Conclusion

MinIO provides a powerful, self-hosted alternative to cloud storage services. Key takeaways:

✅ **Easy Setup**: Docker deployment in minutes
✅ **S3 Compatible**: Use familiar S3 APIs
✅ **Cost Effective**: No cloud storage fees
✅ **Full Control**: Own your data and infrastructure
✅ **High Performance**: Built for speed and scale

Start with the basic implementation and gradually add advanced features as needed. Happy coding! 🚀

