'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Share2, Facebook, Twitter, Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getBlogPostBySlug, getRelatedPosts } from '@/data/blog-data'
import { NotFound } from './NotFound'
import { toast } from '@/components/ui/sonner'
import { calculateReadingTime } from '@/utils/reading-time'
import Link from '@/components/ui/Link'

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState(slug ? getBlogPostBySlug(slug) : null)
  const [relatedPosts, setRelatedPosts] = useState([])
  const [readingTime, setReadingTime] = useState(0)

  useEffect(() => {
    if (slug) {
      const foundPost = getBlogPostBySlug(slug)
      setPost(foundPost)

      if (foundPost) {
        setRelatedPosts(getRelatedPosts(foundPost.id, 2))
        setReadingTime(calculateReadingTime(foundPost.content))
      }
    }
  }, [slug])

  if (!post) {
    return <NotFound />
  }

  // Share functionality
  const handleShare = (platform: string) => {
    const url = window.location.href
    const title = post.title
    let shareUrl = ''

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        toast('Link copied to clipboard!')
        return
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }

  // Convert markdown content to HTML paragraphs
  // This is a very simple implementation - in a real app you would use a markdown parser
  const contentParagraphs = post.content.split('\n\n').map((paragraph, index) => {
    if (paragraph.startsWith('# ')) {
      return (
        <h1 key={index} className="mb-4 mt-8 text-3xl font-bold">
          {paragraph.substring(2)}
        </h1>
      )
    } else if (paragraph.startsWith('## ')) {
      return (
        <h2 key={index} className="mb-3 mt-6 text-2xl font-bold">
          {paragraph.substring(3)}
        </h2>
      )
    } else if (paragraph.startsWith('### ')) {
      return (
        <h3 key={index} className="mb-2 mt-5 text-xl font-bold">
          {paragraph.substring(4)}
        </h3>
      )
    } else if (paragraph.startsWith('- ')) {
      const items = paragraph.split('\n').map((item) => item.substring(2))
      return (
        <ul key={index} className="mb-4 mt-2 list-disc space-y-1 pl-5">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    } else {
      return (
        <p key={index} className="mb-4">
          {paragraph}
        </p>
      )
    }
  })

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

              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
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
            <img src={post.coverImage} alt={post.title} className="h-auto w-full object-cover" />
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">{contentParagraphs}</div>

          {/* Share buttons */}
          <div className="mt-10 border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Share this post:</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleShare('facebook')}
                  title="Share on Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleShare('twitter')}
                  title="Share on Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleShare('linkedin')}
                  title="Share on LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => handleShare('copy')}
                  title="Copy link"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
                    <img
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

export default BlogDetail
