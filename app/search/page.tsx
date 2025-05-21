import connectToDatabase from '@/lib/mongodb'
import BlogModels, { transformToBlogs } from '@/models/blog'
import ProjectModels, { transformToProjects } from '@/models/project'
import SearchForm from './SearchForm'

// Server component that performs initial search based on URL params
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const searchQuery = params.q || ''

  // Initialize with empty results
  let initialResults = { blogs: [], projects: [] }

  // If there's a search query in URL, perform initial server-side search
  if (searchQuery) {
    try {
      await connectToDatabase()

      // Create a case-insensitive search regex
      const searchRegex = { $regex: searchQuery, $options: 'i' }

      // Search for blogs
      const blogs = await BlogModels.find({
        isDraft: false,
        $or: [
          { title: searchRegex },
          { excerpt: searchRegex },
          { content: searchRegex },
          { 'tags.name': searchRegex },
        ],
      }).lean()

      // Search for projects
      const projects = await ProjectModels.find({
        isDraft: false,
        $or: [{ title: searchRegex }, { description: searchRegex }, { 'tags.name': searchRegex }],
      }).lean()

      initialResults = {
        blogs: transformToBlogs(blogs),
        projects: transformToProjects(projects),
      }
    } catch (error) {
      console.error('Server-side search error:', error)
    }
  }

  return (
    <section className="py-12 md:py-20">
      <div className="container-custom max-w-4xl">
        <h1 className="section-heading mb-12 text-center">Search</h1>

        {/* Client component for interactive search */}
        <SearchForm initialQuery={searchQuery} initialResults={initialResults} />
      </div>
    </section>
  )
}
