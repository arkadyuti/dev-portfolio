export interface TLine {
  text: string
  color?: string
  delay?: number
}

export function cmd(command: string): TLine {
  return { text: `$ ${command}`, color: 'text-terminal' }
}

export function out(text: string, color?: string): TLine {
  return { text, color: color || 'text-foreground' }
}

export function dim(text: string): TLine {
  return { text, color: 'text-muted-foreground' }
}

export function accent(text: string): TLine {
  return { text, color: 'text-primary' }
}

export function blank(delay?: number): TLine {
  return { text: '', color: '', delay }
}
