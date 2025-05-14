import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid';
import { minioClient, uploadFile, makeFilePublic, getPublicFileUrl } from '@/lib/minio';
import BlogModels from 'models/blog';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const coverImage = formData.get('coverImage') as File
    const blogId = request.nextUrl.searchParams.get('blogId')

    // Get other form data
    const title = formData.get('title')
    const author = formData.get('author')
    const excerpt = formData.get('excerpt')
    const content = formData.get('content')
    const featured = formData.get('featured') === 'true'
    const tags = JSON.parse(formData.get('tags') as string)
    const isDraft = formData.get('isDraft') === 'true'

    let coverImageKey = '';
    let coverImageUrl = '';

    const targetBlogId = blogId ? blogId : uuidv4()
    
    // Handle cover image upload if provided
    if (coverImage) {
      // Convert file to buffer
      const bytes = await coverImage.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Create a unique filename
      const fileExtension = coverImage.name.split('.').pop()
      const filename = `${targetBlogId}_cover-image.${fileExtension}`

      // Get the bucket name from environment variable
      const bucketName = process.env.MINIO_IMAGE_BUCKET
      // Upload to MinIO with metadata
      await uploadFile(
        bucketName,
        filename,
        buffer,
        {
          'Content-Type': coverImage.type || 'application/octet-stream',
          'Original-Name': coverImage.name,
          'Upload-Date': new Date().toISOString()
        }
      )

      coverImageKey = filename;
      
      // Make the specific image file public and get permanent URL
      await makeFilePublic(bucketName, filename);
      coverImageUrl = getPublicFileUrl(bucketName, filename);
    }

    const dataToSave = {
      id: targetBlogId,
      publishedAt: Date.now(),
      title,
      author,
      excerpt,
      content,
      featured,
      tags,
      isDraft,
      ...(coverImageUrl && { coverImage: coverImageUrl }),
      ...(coverImageKey && { coverImageKey })
    }

    let savedArticle;
    if (blogId) {
      // Update existing blog
      const existingBlog = await BlogModels.findOne({ id: blogId });
      if (!existingBlog) {
        return NextResponse.json(
          { success: false, message: 'Blog not found' },
          { status: 404 }
        )
      }

      // If updating and there's a new cover image, we might want to clean up the old one
      if (coverImage && existingBlog.coverImageKey && existingBlog.coverImageKey !== coverImageKey) {
        // Delete old image if needed (optional)
        // await deleteFile(bucketName, existingBlog.coverImageKey);
      }

      // Update the document with new data
      Object.assign(existingBlog, dataToSave);
      savedArticle = await existingBlog.save();
    } else {
      // Create new blog
      const newArticle = new BlogModels(dataToSave);
      savedArticle = await newArticle.save();
    }

    return NextResponse.json({
      success: true,
      data: savedArticle
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error processing blog post:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process blog post' },
      { status: 500 }
    )
  }
}