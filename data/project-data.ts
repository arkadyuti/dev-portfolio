
export interface Project {
  id: string
  title: string
  description: string
  technologies: string[]
  imageUrl: string
  demoUrl?: string
  sourceUrl?: string
  featured?: boolean
}

export const projects: Project[] = [
  {
    id: "1",
    title: "E-commerce Dashboard",
    description: "A responsive admin dashboard for e-commerce platforms with real-time analytics, inventory management, and order processing capabilities.",
    technologies: ["React", "TypeScript", "Tailwind CSS", "Chart.js", "Firebase"],
    imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    demoUrl: "https://demo.example.com/ecommerce-dashboard",
    sourceUrl: "https://github.com/yourusername/ecommerce-dashboard",
    featured: true
  },
  {
    id: "2",
    title: "Weather App",
    description: "A weather application that provides real-time weather data, forecasts, and location-based services with a clean, intuitive interface.",
    technologies: ["React", "OpenWeatherMap API", "Geolocation API", "CSS Modules"],
    imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    demoUrl: "https://demo.example.com/weather-app",
    sourceUrl: "https://github.com/yourusername/weather-app"
  },
  {
    id: "3",
    title: "Portfolio Website",
    description: "A custom-built portfolio website featuring responsive design, blog functionality, and project showcases.",
    technologies: ["NextJS", "TypeScript", "Tailwind CSS", "React Query"],
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    demoUrl: "https://yourdomain.com",
    sourceUrl: "https://github.com/yourusername/portfolio",
    featured: true
  }
]

export const getFeaturedProjects = () => {
  return projects.filter(project => project.featured)
}
