import connectToDatabase from '@/lib/mongodb'
import BlogModels from '@/models/blog'
import ProjectModels from '@/models/project'
import siteMetadata from '@/data/siteMetadata'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteMetadata.siteUrl

  // Static routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
  ]

  // Dynamic blog routes
  const blogRoutes = []
  // Skip dynamic routes during build if MongoDB is not available
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

  if (!isBuildTime) {
    try {
      await connectToDatabase()
      const blogs = await BlogModels.find({ isDraft: false }).select('slug publishedAt').lean()

      for (const blog of blogs) {
        blogRoutes.push({
          url: `${baseUrl}/blogs/${blog.slug}`,
          lastModified: new Date(blog.publishedAt || Date.now()),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        })
      }
    } catch (error) {
      console.error('Error fetching blog posts for sitemap:', error)
    }
  }

  // Dynamic project routes (if individual project pages exist)
  const projectRoutes = []
  if (!isBuildTime) {
    try {
      await connectToDatabase()
      const projects = await ProjectModels.find({ isDraft: false }).select('slug').lean()

      for (const project of projects) {
        // Only add if individual project pages exist
        if (project.slug) {
          projectRoutes.push({
            url: `${baseUrl}/projects/${project.slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching projects for sitemap:', error)
    }
  }

  return [...staticRoutes, ...blogRoutes, ...projectRoutes]
}
