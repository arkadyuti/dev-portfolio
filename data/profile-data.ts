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
  bio: 'Associate Architect at Tekion with 9+ years across AI agent systems, platform infrastructure, and distributed architectures. Currently building multi-agent pipelines with Agno and LangGraph over a RAG layer with vector search and graph-based code analysis, running on Azure AKS with ArgoCD-driven GitOps. Previously shipped enterprise CI/CD for 250+ developers and IoT platforms handling millions of MQTT messages.',
  longBio: `
# About Me

Associate Architect at Tekion, focused on AI agent systems and platform infrastructure. I build multi-agent pipelines using Agno and LangGraph that sit on top of a RAG layer — vector embeddings for semantic search and graph-based code traversal, indexing thousands of repositories and internal docs. The agents handle everything from Semgrep-based vulnerability triage to OpenAPI compliance scoring, with MCP integrations tying it all together.

## Current Focus

On the AI side: LangGraph-based agent orchestration, CopilotKit runtimes powering an embeddable chat widget (Shadow DOM, multi-agent routing), and observability through Langfuse for per-user LLM tracing and OpenTelemetry for cross-service audit events.

On the platform side: OAuth 2.0 flows through APISIX Edge Gateway with session auth, PKCE, and silent refresh. RBAC via CASL with role hierarchy enforcement and audit logging. Infrastructure on Azure AKS with ArgoCD GitOps, Jenkins CI/CD with rollout verification and per-service deploy locking, MFE pipelines with CDN-based build promotion. Prometheus and Grafana for monitoring with dedicated vector DB and graph DB node pools.

## Earlier Work

Led frontend CI/CD for 250+ developers — custom Jest-based testing library, 50% build time reduction with multi-stage Docker, 4x cost savings through build-once promote-everywhere across six environments. Built a theming framework using CDN-served JSON tokens and Module Federation, removing the need for per-tenant codebases.

Before that, designed a distributed IoT platform for connected displays — RFID, OBD telemetry, real-time alerts on AWS IoT, MQTT, and SQS handling millions of messages. Scaled the team from 3 to 35+ engineers through the full product lifecycle.

## Beyond Code

When I'm not building, I'm usually gaming on my PC or PS5. Always up for conversations about agent architectures, distributed systems, or platform engineering.
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
      category: 'AI & Protocols',
      items: [
        'MCP',
        'Agno',
        'LangGraph',
        'CopilotKit',
        'RAG',
        'Semantic Search',
        'Vector Embeddings',
        'OpenTelemetry',
        'Langfuse',
        'Flowise',
      ],
    },
    {
      category: 'Architecture',
      items: [
        'System Design',
        'Distributed Systems',
        'Microservices',
        'Event-Driven Architecture',
        'API Design',
        'Design Patterns',
      ],
    },
    {
      category: 'Languages',
      items: ['JavaScript', 'TypeScript', 'Golang', 'Python'],
    },
    {
      category: 'Frontend',
      items: ['React', 'Next.js', 'Module Federation', 'Redux', 'Tailwind CSS'],
    },
    {
      category: 'Backend & Database',
      items: [
        'Node.js',
        'NestJS',
        'Express',
        'PostgreSQL',
        'MongoDB',
        'Qdrant',
        'Neo4j',
        'Redis',
        'Prisma',
        'MQTT',
      ],
    },
    {
      category: 'Cloud & DevOps',
      items: [
        'Azure AKS',
        'AWS',
        'Kubernetes',
        'ArgoCD',
        'APISIX',
        'Docker',
        'Jenkins',
        'Prometheus',
        'Grafana',
      ],
    },
  ],
  aboutPageMetadata: {
    title: 'About Me',
    description:
      'Associate Architect building AI agent systems with Agno, LangGraph, and RAG. Platform infrastructure on Azure AKS with ArgoCD, enterprise CI/CD, and distributed IoT architectures.',
    keywords:
      'associate architect, AI agents, LangGraph, Agno, MCP, RAG, Azure AKS, ArgoCD, Kubernetes, CI/CD, distributed systems, platform engineering, OpenTelemetry, Langfuse',
  },
}
