import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { calculateReadingTime } from '@/utils/reading-time'
import Link from '@/components/ui/Link'
import Image from 'next/image'
import BlogModels, { transformToBlog, IBlog } from 'models/blog'
import { ShareButtons } from './ShareButtons'

// Server-side data fetching
async function getBlogPost(slug: string): Promise<IBlog | null> {
  try {
    const post = await BlogModels.findOne({ slug, isDraft: false }).lean()
    if (!post) return null
    return transformToBlog(post)
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return null
  }
}

async function getRelatedPosts(currentPostId: string): Promise<IBlog[]> {
  try {
    const posts = await BlogModels.find({
      id: { $ne: currentPostId },
      isDraft: false,
    })
      .sort({ publishedAt: -1 })
      .limit(2)
      .lean()

    return posts.map((post) => transformToBlog(post)).filter((post): post is IBlog => post !== null)
  } catch (error) {
    console.error('Error fetching related posts:', error)
    return []
  }
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedPosts(post.id)
  const readingTime = calculateReadingTime(post.content)

  return (
    <>
      <article className="py-12">
        <div className="container-custom max-w-4xl">
          {/* Back to blog */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="pl-0 transition-all duration-200 hover:pl-2">
              <Link href="/blog" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to all posts
              </Link>
            </Button>
          </div>

          {/* Header */}
          <header className="mb-10">
            <h1 className="mb-6 text-4xl font-bold md:text-5xl">{post.title}</h1>

            <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  {post.author.charAt(0)}
                </div>
                <span>{post.author}</span>
              </div>

              <time dateTime={post.publishedAt.toString()}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>

              <span className="flex items-center">
                <span className="mx-2 inline-block h-1 w-1 rounded-full bg-muted-foreground md:hidden"></span>
                <span>{readingTime} min read</span>
              </span>
            </div>

            <div className="mb-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/blog?tag=${tag.id}`}>
                  <Badge variant="outline" className="hover:bg-secondary">
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </header>

          {/* Cover Image */}
          <div className="mb-10 overflow-hidden rounded-xl">
            <Image
              width={848}
              height={560}
              src={post.coverImage}
              alt={post.title}
              className="h-auto w-full object-cover"
              priority
            />
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="mb-4">{post.content}</p>
          </div>

          {/* Share buttons */}
          <div className="mt-10 border-t pt-4">
            <ShareButtons post={post} />
          </div>

          {/* Tags */}
          <div className="mt-12 border-t pt-8">
            <h3 className="mb-4 text-lg font-semibold">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/blog?tag=${tag.id}`}>
                  <Badge variant="outline" className="hover:bg-secondary">
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-secondary/50 py-12">
          <div className="container-custom max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold">Related Posts</h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/blog/${relatedPost.slug}`}
                  className="blog-card group block"
                >
                  <div className="aspect-video overflow-hidden">
                    <Image
                      width={406}
                      height={228}
                      src={relatedPost.coverImage}
                      alt={relatedPost.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold transition-colors group-hover:text-primary">
                      {relatedPost.title}
                    </h3>
                    <p className="mb-4 line-clamp-2 text-muted-foreground">{relatedPost.excerpt}</p>
                    <div className="flex flex-wrap gap-2">
                      {relatedPost.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag.id} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
