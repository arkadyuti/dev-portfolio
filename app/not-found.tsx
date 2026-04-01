import Link from '@/components/ui/Link'
import { Button } from '@/components/ui/button'
import { NotFoundTerminal } from './not-found-terminal'

export default function NotFound() {
  return (
    <div className="grid-bg flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Glitching 404 — CSS only */}
        <div className="mb-8 text-center">
          <h1 className="relative font-mono text-[8rem] font-black leading-none tracking-tighter text-primary/20 md:text-[12rem]">
            <span
              className="absolute inset-0 text-primary/10"
              style={{ clipPath: 'inset(10% 0 60% 0)', transform: 'translateX(-3px)' }}
              aria-hidden="true"
            >
              404
            </span>
            <span
              className="absolute inset-0 text-primary/10"
              style={{ clipPath: 'inset(50% 0 10% 0)', transform: 'translateX(3px)' }}
              aria-hidden="true"
            >
              404
            </span>
            404
          </h1>
        </div>

        {/* Terminal block with fake logs */}
        <div className="terminal-block">
          <div className="terminal-header">
            <span className="terminal-dot bg-destructive/80" />
            <span className="terminal-dot bg-yellow-500/80" />
            <span className="terminal-dot bg-terminal/80" />
            <span className="ml-2 text-muted-foreground/60">not_found.sh</span>
          </div>
          <NotFoundTerminal />
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild className="font-mono text-xs">
            <Link href="/">cd ~</Link>
          </Button>
          <Button asChild variant="outline" className="border-border/50 font-mono text-xs">
            <Link href="/blogs">ls ./blogs</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
