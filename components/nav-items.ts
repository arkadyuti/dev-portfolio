import { Home, FileText, User, Briefcase, Search, LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export const mainNavItems: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Blog', href: '/blogs', icon: FileText },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'About', href: '/about', icon: User },
]

export const searchNavItem: NavItem = {
  name: 'Search',
  href: '/search',
  icon: Search,
}
