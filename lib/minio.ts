import * as Minio from 'minio'
import logger from './logger'

// Lazy-loaded MinIO client to avoid build-time initialization issues
let minioClient: Minio.Client | null = null
let initializationAttempted = false

function getMinioClient(): Minio.Client {
  if (!initializationAttempted) {
    initializationAttempted = true

    if (!process.env.MINIO_ENDPOINT) {
      logger.warn('MinIO not configured: MINIO_ENDPOINT not set')
      return null as any
    }

    try {
      const clientConfig = {
        endPoint: process.env.MINIO_ENDPOINT,
        port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET || 'minioadmin',
      }

      minioClient = new Minio.Client(clientConfig)
      logger.info('MinIO client initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize MinIO client:', error)
      minioClient = null
    }
  }

  if (!minioClient) {
    throw new Error('MinIO client not initialized. Please check your MINIO_ENDPOINT configuration.')
  }

  return minioClient
}

export { getMinioClient as minioClient }

// Utility functions with better error handling
export async function ensureBucket(bucketName: string) {
  const client = getMinioClient()

  try {
    const exists = await client.bucketExists(bucketName)
    if (!exists) {
      await client.makeBucket(bucketName)
      logger.info(`Created bucket: ${bucketName}`)
    }
  } catch (error: unknown) {
    logger.error(`Failed to ensure bucket ${bucketName}:`, error)

    // If it's a network error, provide more context
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      if (error.code === 'EPROTO' || error.code === 'ECONNREFUSED') {
        throw new Error(
          `Network error connecting to MinIO: ${error.message}. Check your MINIO_ENDPOINT configuration.`
        )
      }

      // If it's an access error, provide guidance
      if (error.code === 'AccessDenied' || error.code === 'InvalidAccessKeyId') {
        throw new Error(`Access denied: Check your MINIO_KEY and MINIO_SECRET configuration.`)
      }
    }

    throw error
  }
}

export async function uploadFile(
  bucketName: string,
  fileName: string,
  buffer: Buffer,
  metadata: Record<string, string> = {}
) {
  try {
    await ensureBucket(bucketName)

    const client = getMinioClient()
    return await client.putObject(bucketName, fileName, buffer, buffer.length, metadata)
  } catch (error: unknown) {
    logger.error('Upload failed:', error)
    throw error
  }
}

export async function getPresignedUrl(
  bucketName: string,
  fileName: string,
  expirySeconds: number = 7 * 24 * 60 * 60
) {
  const client = getMinioClient()

  try {
    return await client.presignedGetObject(bucketName, fileName, expirySeconds)
  } catch (error: unknown) {
    logger.error('Failed to generate presigned URL:', error)
    throw error
  }
}

export async function deleteFile(bucketName: string, fileName: string) {
  const client = getMinioClient()
  return await client.removeObject(bucketName, fileName)
}

export function getPublicFileUrl(bucketName: string, fileName: string): string {
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'
  const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : ''
  return `${protocol}://${process.env.MINIO_ENDPOINT}/${bucketName}/${fileName}`
}

// Types
export interface UploadResult {
  fileName: string
  bucketName: string
  url: string
  size: number
}

export interface MinioConfig {
  endPoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
}

interface PolicyStatement {
  Effect: string
  Principal?: {
    AWS: string[]
  }
  Action: string[]
  Resource: string[]
}

interface BucketPolicy {
  Version: string
  Statement: PolicyStatement[]
}

// Set object policy to make specific file public
export async function makeFilePublic(bucketName: string, fileName: string) {
  const client = getMinioClient()

  try {
    // Get current bucket policy
    let policy: BucketPolicy
    try {
      const policyJson = await client.getBucketPolicy(bucketName)
      policy = JSON.parse(policyJson) as BucketPolicy
    } catch (error: unknown) {
      // If no policy exists, create a new one
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'NoSuchBucketPolicy'
      ) {
        policy = {
          Version: '2012-10-17',
          Statement: [],
        }
      } else {
        throw error
      }
    }

    // Add or update statement for this specific file
    const resource = `arn:aws:s3:::${bucketName}/${fileName}`

    // Check if there's already a statement for public read access
    let publicReadStatement = policy.Statement.find(
      (s: PolicyStatement) =>
        s.Effect === 'Allow' &&
        s.Principal?.AWS?.includes('*') &&
        s.Action?.includes('s3:GetObject')
    )

    if (!publicReadStatement) {
      // Create a new statement for public read access
      publicReadStatement = {
        Effect: 'Allow',
        Principal: {
          AWS: ['*'],
        },
        Action: ['s3:GetObject'],
        Resource: [],
      }
      policy.Statement.push(publicReadStatement)
    }

    // Ensure Resource is an array
    if (typeof publicReadStatement.Resource === 'string') {
      publicReadStatement.Resource = [publicReadStatement.Resource]
    }

    // Add the resource if it's not already in the list
    if (!publicReadStatement.Resource.includes(resource)) {
      publicReadStatement.Resource.push(resource)
    }

    await client.setBucketPolicy(bucketName, JSON.stringify(policy))

    // Return the permanent public URL
    return getPublicFileUrl(bucketName, fileName)
  } catch (error) {
    logger.error(`Failed to make file public: ${error}`)
    throw error
  }
}
