import * as Minio from 'minio'
import logger from './logger'

// Create MinIO client instance with detailed configuration
const clientConfig = {
  endPoint: process.env.MINIO_ENDPOINT,
  accessKey: process.env.MINIO_KEY,
  secretKey: process.env.MINIO_SECRET,
}

export const minioClient = new Minio.Client(clientConfig)

// Utility functions with better error handling
export async function ensureBucket(bucketName: string) {
  try {
    const exists = await minioClient.bucketExists(bucketName)
    if (!exists) {
      await minioClient.makeBucket(bucketName)
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

    return await minioClient.putObject(bucketName, fileName, buffer, buffer.length, metadata)
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
  try {
    return await minioClient.presignedGetObject(bucketName, fileName, expirySeconds)
  } catch (error: unknown) {
    logger.error('Failed to generate presigned URL:', error)
    throw error
  }
}

export async function deleteFile(bucketName: string, fileName: string) {
  return await minioClient.removeObject(bucketName, fileName)
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
  try {
    // Get current bucket policy
    let policy: BucketPolicy
    try {
      const policyJson = await minioClient.getBucketPolicy(bucketName)
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

    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy))

    // Return the permanent public URL
    return getPublicFileUrl(bucketName, fileName)
  } catch (error) {
    logger.error(`Failed to make file public: ${error}`)
    throw error
  }
}
