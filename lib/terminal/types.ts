export interface OutputLine {
  text: string
  color?: string
  href?: string // makes the line a clickable link
  isHtml?: boolean // render as raw HTML (for ASCII art)
}

export type CommandResult =
  | { type: 'output'; lines: OutputLine[] }
  | { type: 'action'; action: 'clear' | 'navigate' | 'matrix'; payload?: string }

export interface CommandContext {
  history: string[]
}

export type CommandHandler = (args: string[], context: CommandContext) => CommandResult

export interface CommandDef {
  name: string
  description: string
  handler: CommandHandler
}
