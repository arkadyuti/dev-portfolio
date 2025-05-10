
// Ensure all required functions and types are exported to fix build errors
export interface Tag {
  id: string;
  name: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  date: string;
  content: string;
  excerpt: string;
  coverImage: string;
  tags: Tag[];
  featured?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Getting Started with React",
    slug: "getting-started-with-react",
    author: "Jane Smith",
    date: "2023-05-15",
    content: "React is a JavaScript library for building user interfaces. It allows developers to create large web applications that can change data, without reloading the page. The main purpose of React is to be fast, scalable, and simple. It works only on user interfaces in the application. This corresponds to the view in the MVC template. React was created by Jordan Walke, a software engineer at Facebook, who released an early prototype of React called 'FaxJS'. It was first deployed on Facebook's News Feed in 2011 and later on Instagram in 2012. It was open-sourced at JSConf US in May 2013.",
    excerpt: "Learn the basics of React, the popular JavaScript library for building user interfaces.",
    coverImage: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2",
    tags: [{ id: "1", name: "React" }, { id: "2", name: "JavaScript" }],
    featured: true
  },
  {
    id: "2",
    title: "Mastering TypeScript",
    slug: "mastering-typescript",
    author: "John Doe",
    date: "2023-06-22",
    content: "TypeScript is a programming language developed and maintained by Microsoft. It is a strict syntactical superset of JavaScript and adds optional static typing to the language. TypeScript is designed for the development of large applications and transcompiles to JavaScript. As TypeScript is a superset of JavaScript, existing JavaScript programs are also valid TypeScript programs. TypeScript may be used to develop JavaScript applications for both client-side and server-side execution (as with Node.js or Deno). There are multiple options available for transcompilation. Either the default TypeScript Checker can be used, or the Babel compiler can be invoked to convert TypeScript to JavaScript.",
    excerpt: "Dive deep into TypeScript features and learn how to leverage its powerful type system.",
    coverImage: "https://images.unsplash.com/photo-1613490900233-141c5560d75d",
    tags: [{ id: "2", name: "JavaScript" }, { id: "3", name: "TypeScript" }]
  },
  {
    id: "3",
    title: "CSS Tips and Tricks",
    slug: "css-tips-and-tricks",
    author: "Sarah Johnson",
    date: "2023-07-10",
    content: "CSS (Cascading Style Sheets) is a stylesheet language used to describe the presentation of a document written in HTML or XML. CSS is designed to enable the separation of presentation and content, including layout, colors, and fonts. This separation can improve content accessibility, provide more flexibility and control in the specification of presentation characteristics, enable multiple web pages to share formatting, and reduce complexity and repetition in the structural content. Separation of formatting and content also makes it feasible to present the same markup page in different styles for different rendering methods, such as on-screen, in print, by voice (via speech-based browser or screen reader), and on Braille-based tactile devices.",
    excerpt: "Discover advanced CSS techniques that will enhance your web design projects.",
    coverImage: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb",
    tags: [{ id: "4", name: "CSS" }, { id: "5", name: "Web Design" }],
    featured: true
  }
];

export const tags: Tag[] = [
  { id: "1", name: "React" },
  { id: "2", name: "JavaScript" },
  { id: "3", name: "TypeScript" },
  { id: "4", name: "CSS" },
  { id: "5", name: "Web Design" },
  { id: "6", name: "NodeJS" },
  { id: "7", name: "NextJS" },
  { id: "8", name: "TailwindCSS" }
];

// Functions to retrieve blog data
export const getBlogPostById = (id: string): BlogPost | undefined => {
  return blogPosts.find(post => post.id === id);
};

export const getBlogPostBySlug = (slug: string): BlogPost | undefined => {
  return blogPosts.find(post => post.slug === slug);
};

export const getBlogTags = (): Tag[] => {
  return tags;
};

export const getFeaturedBlogPosts = (): BlogPost[] => {
  return blogPosts.filter(post => post.featured);
};

// Additional exported functions needed by other components
export const getRelatedPosts = (currentPostId: string, tagIds: any): BlogPost[] => {
  return blogPosts.slice(0, 3);
};

export const getPaginatedBlogPosts = (page: number = 1, perPage: number = 6): { posts: BlogPost[], total: number } => {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    posts: blogPosts.slice(start, end),
    total: blogPosts.length
  };
};

export const getFilteredBlogPosts = (tagId?: string): BlogPost[] => {
  if (!tagId) return blogPosts;
  return blogPosts.filter(post => post.tags.some(tag => tag.id === tagId));
};
