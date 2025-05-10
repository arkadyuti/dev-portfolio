
export interface Profile {
  name: string
  title: string
  bio: string
  longBio: string
  profileImage: string
  socialLinks: {
    github: string
    linkedin: string
    twitter: string
    email: string
  }
  skills: {
    category: string
    items: string[]
  }[]
}

export const profile: Profile = {
  name: "John Doe",
  title: "Frontend Associate Architect",
  bio: "I'm a passionate frontend architect with expertise in building scalable, performant web applications. I specialize in modern JavaScript frameworks and love creating exceptional user experiences.",
  longBio: `
# About Me

I'm a frontend associate architect with over 5 years of experience in building modern web applications. I specialize in creating scalable frontend architectures that balance performance, developer experience, and maintainability.

## My Approach

I believe in taking a thoughtful approach to frontend development that considers the entire lifecycle of an application. This means:

- Writing clean, maintainable code that others can easily understand
- Building flexible architectures that can evolve with changing requirements
- Focusing on performance and accessibility from day one
- Choosing the right tools for each specific project rather than following trends

## Professional Journey

My journey began as a UI designer, which gave me a strong foundation in user experience and interface design. I transitioned to frontend development, where I found my passion for translating designs into functional, accessible code.

As I progressed in my career, I became increasingly interested in the architectural aspects of frontend development—how to structure applications that can scale effectively and remain maintainable over time.

Today, as a Frontend Associate Architect, I work at the intersection of design, development, and architecture. I help teams implement best practices, establish conventions, and build robust frontend systems that serve both users and developers well.

## Beyond Coding

When I'm not coding, I enjoy contributing to open-source projects, writing technical articles, and mentoring junior developers. I'm also an avid photographer and enjoy hiking in my free time.

I'm always open to discussing new projects, opportunities, or just chatting about frontend development. Feel free to reach out!
  `,
  profileImage: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
  socialLinks: {
    github: "https://github.com/johndoe",
    linkedin: "https://linkedin.com/in/johndoe",
    twitter: "https://twitter.com/johndoe",
    email: "mailto:john@example.com"
  },
  skills: [
    {
      category: "Frontend Frameworks",
      items: ["React", "Angular", "Vue.js", "Next.js", "Gatsby"]
    },
    {
      category: "Languages",
      items: ["TypeScript", "JavaScript (ES6+)", "HTML5", "CSS3/SASS/LESS"]
    },
    {
      category: "State Management",
      items: ["Redux", "MobX", "Context API", "Recoil", "React Query"]
    },
    {
      category: "UI Libraries",
      items: ["Tailwind CSS", "Material UI", "Styled Components", "Emotion", "Chakra UI"]
    },
    {
      category: "Testing",
      items: ["Jest", "React Testing Library", "Cypress", "Storybook"]
    },
    {
      category: "Build Tools",
      items: ["Webpack", "Vite", "Babel", "ESLint", "Prettier"]
    },
    {
      category: "Architecture",
      items: ["Micro Frontends", "Component Libraries", "Design Systems", "Progressive Web Apps"]
    }
  ]
}
