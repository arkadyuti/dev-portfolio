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
  aboutPageMetadata: {
    title: string
    description: string
    keywords: string
  }
}

export const profile: Profile = {
  name: 'Arkadyuti Sarkar',
  title: 'Associate Architect @ Tekion',
  bio: 'Associate Architect at Tekion with 9+ years building AI-powered developer workflows, enterprise CI/CD systems, and IoT platforms. Specializing in LangChain/LangGraph frameworks, RAG implementations, and Model Context Protocol (MCP) while scaling engineering teams and solutions across 250+ developers.',
  longBio: `
# About Me

Associate Architect at Tekion, deeply passionate about transforming developer workflows through AI. Currently building production AI systems with LangChain/LangGraph, implementing RAG pipelines with Vector Databases, and architecting intelligent agents using Model Context Protocol (MCP). My work focuses on creating AI solutions that understand code context, development patterns, and deliver measurable impact.

My technical journey has been shaped by a simple belief: good architecture makes hard problems feel easy. Whether it's designing microservices that scale, optimizing Docker builds, or implementing MQTT for real-time IoT communication, I focus on creating solutions that developers actually want to use.

## My Approach

I've worked across the full stack - from React and TypeScript on the frontend to Golang & Node.js on the backend. But what really excites me now is the AI infrastructure layer: LangChain orchestration, RAG implementations, Vector Database optimization, and production observability with LangFuse. There's something deeply satisfying about watching AI agents handle complex workflows gracefully while maintaining reliability and performance.

Recent focus areas include building context-aware AI agents with LangGraph, implementing production-grade RAG systems, leveraging Vector Databases for semantic search, and finding the right balance between automation and human judgment in AI-powered development tools.

## Professional Journey

Over 9+ years, I've scaled teams from 3 to 35+ engineers while architecting solutions adopted by 250+ developers organization-wide. From building IoT platforms deployed across General Motors dealerships to achieving 50% build time reduction through Docker optimization, I've consistently focused on making engineering more enjoyable and efficient.

Key achievements include:
- Architecting production AI systems with LangChain/LangGraph and RAG pipelines
- Core contributor to AI workflow framework using Model Context Protocol (MCP)
- Reduced OEM deployment cycles from 6+ months to weeks through platform engineering
- Built Connected Displays IoT solution handling millions of MQTT requests
- Achieved 4x cost reduction through build-once, promote-everywhere CI/CD strategy

## Beyond Coding

I believe the best code is the code you don't have to write, and the best systems are the ones that feel invisible to their users. Always interested in discussions about AI agents, RAG architectures, system design, developer tooling, or how we can make engineering more enjoyable with intelligent automation.

Outside of work, I enjoy gaming on my PC or PS5—it's my way of relaxing and staying inspired by great user experiences. Feel free to reach out!
  `,
  profileImage: 'https://minio-api.3027622.siliconpin.com/portfolio/arkadyuti-sarkar.jpg',
  socialLinks: {
    github: 'https://github.com/arkadyuti',
    linkedin: 'https://www.linkedin.com/in/arkadyuti/',
    twitter: 'https://x.com/arkadooti',
    email: 'mailto:diva_diagram_4v@icloud.com',
  },
  skills: [
    {
      category: 'AI & Emerging Tech',
      items: [
        'LangChain/LangGraph',
        'LangFuse',
        'Model Context Protocol (MCP)',
        'RAG (Retrieval-Augmented Generation)',
        'Vector Databases',
        'Prompt Engineering',
      ],
    },
    {
      category: 'Frontend Development',
      items: [
        'React.js (9+ years)',
        'Next.js',
        'TypeScript',
        'Redux',
        'Tailwind CSS',
        'HTML5',
        'CSS3',
        'JavaScript (ES6+)',
        'Webpack',
      ],
    },
    {
      category: 'Backend Development',
      items: [
        'Golang',
        'Node.js (8+ years)',
        'RESTful APIs',
        'Microservices Architecture',
        'Python',
        'PHP',
      ],
    },
    {
      category: 'Cloud & DevOps',
      items: [
        'AWS (EC2, S3, Lambda, IoT Core)',
        'Docker',
        'CI/CD Pipeline Design',
        'Infrastructure as Code',
        'Jenkins',
      ],
    },
    {
      category: 'Database & Messaging',
      items: ['MongoDB', 'MySQL', 'Redis', 'MQTT', 'SQS'],
    },
    {
      category: 'IoT & Hardware',
      items: [
        'IoT Architecture',
        'MQTT Protocol',
        'OTA Updates',
        'Android Development',
        'Remote Debugging',
      ],
    },
    {
      category: 'Testing & Quality',
      items: ['Jest', 'ESLint', 'Unit Testing', 'Integration Testing', 'Performance Testing'],
    },
    {
      category: 'Architecture & Leadership',
      items: [
        'Component Libraries',
        'Design Systems',
        'Technical Leadership',
        'Team Scaling',
        'Mentoring',
        'Cross-functional Collaboration',
      ],
    },
  ],
  aboutPageMetadata: {
    title: 'About Me',
    description:
      'Learn more about me, my skills, and my experience as an Associate Architect at Tekion specializing in AI-powered developer workflows, enterprise CI/CD systems, and IoT platforms.',
    keywords:
      'associate architect, AI developer workflows, Model Context Protocol, MCP, enterprise architecture, CI/CD optimization, IoT platforms, technical leadership, about me, skills, experience, portfolio',
  },
}
