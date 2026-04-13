import { profile } from '@/data/profile-data'
import type { CommandResult, CommandDef, CommandContext, OutputLine } from './types'

function out(text: string, color?: string): OutputLine {
  return { text, color }
}

function link(text: string, href: string, color = 'text-primary'): OutputLine {
  return { text, color, href }
}

function html(text: string, color?: string): OutputLine {
  return { text, color, isHtml: true }
}

// ── Standard commands ──────────────────────────────────────────────

const helpCmd: CommandDef = {
  name: 'help',
  description: 'List available commands',
  handler: () => ({
    type: 'output',
    lines: [
      out('Available commands:', 'text-primary font-bold'),
      out(''),
      ...commandDefs.map((c) =>
        html(`  <span class="text-terminal">${c.name}</span> <span class="text-muted-foreground">—</span> ${c.description}`)
      ),
      out(''),
      out('Tip: use Tab for autocomplete, arrow keys for history', 'text-muted-foreground'),
    ],
  }),
}

const clearCmd: CommandDef = {
  name: 'clear',
  description: 'Clear terminal output',
  handler: () => ({ type: 'action', action: 'clear' }),
}

const LS_DIRS: Record<string, string> = {
  projects: 'cd projects', 'projects/': 'cd projects', './projects': 'cd projects',
  blogs: 'cd blogs', 'blogs/': 'cd blogs', './blogs': 'cd blogs',
  posts: 'cd blogs', './posts': 'cd blogs',
}

const lsCmd: CommandDef = {
  name: 'ls',
  description: 'List directory contents',
  handler: (args) => {
    const target = args[0] || './'
    if (['./', '.'].includes(target) || !args.length) {
      return {
        type: 'output',
        lines: [
          link('projects/', '/projects', 'text-primary'),
          link('blogs/', '/blogs', 'text-primary'),
          link('about.md', '/about', 'text-primary'),
          link('resume.pdf', '/resume', 'text-primary'),
        ],
      }
    }
    const hint = LS_DIRS[target]
    if (hint) {
      return { type: 'output', lines: [out(`Use "${hint}" to navigate there`, 'text-muted-foreground')] }
    }
    return { type: 'output', lines: [out(`ls: cannot access '${target}': No such file or directory`, 'text-destructive')] }
  },
}

const CD_ROUTES: Record<string, string> = {
  projects: '/projects', 'projects/': '/projects', './projects': '/projects',
  blogs: '/blogs', 'blogs/': '/blogs', './blogs': '/blogs',
  posts: '/blogs', './posts': '/blogs',
  about: '/about', './about': '/about',
  home: '/', './home': '/',
}

const cdCmd: CommandDef = {
  name: 'cd',
  description: 'Change directory (navigate)',
  handler: (args) => {
    const target = args[0]
    if (!target || target === '~' || target === '/') {
      return { type: 'action', action: 'navigate', payload: '/' }
    }
    const route = CD_ROUTES[target]
    if (route) {
      return { type: 'action', action: 'navigate', payload: route }
    }
    return { type: 'output', lines: [out(`bash: cd: ${target}: No such file or directory`, 'text-destructive')] }
  },
}

const CAT_NAVIGATE: Record<string, string> = {
  'about.md': '/about', './about.md': '/about',
  'resume.pdf': '/resume', './resume.pdf': '/resume',
  'resume.md': '/resume', './resume.md': '/resume',
}

function catStackConf(): CommandResult {
  const lines: OutputLine[] = []
  for (const cat of profile.skills) {
    const key = cat.category.toLowerCase().replace(/\s+&\s+/g, '_').replace(/\s+/g, '_')
    lines.push(out(`${key} =`, 'text-primary'))
    lines.push(out(`  ${cat.items.join(', ')}`, 'text-foreground/80'))
  }
  lines.push(out(''))
  lines.push(out(`// ${profile.skills.flatMap(c => c.items).length} packages loaded.`, 'text-muted-foreground'))
  return { type: 'output', lines }
}

const CAT_OUTPUT: Record<string, () => CommandResult> = {
  './role': () => ({ type: 'output', lines: [out(profile.title)] }),
  'role': () => ({ type: 'output', lines: [out(profile.title)] }),
  '/etc/stack.conf': catStackConf,
  './stack.conf': catStackConf,
}

const catCmd: CommandDef = {
  name: 'cat',
  description: 'Display file contents',
  handler: (args) => {
    const target = args[0]
    if (!target) {
      return { type: 'output', lines: [out('cat: missing operand', 'text-destructive')] }
    }
    const navRoute = CAT_NAVIGATE[target]
    if (navRoute) {
      return { type: 'action', action: 'navigate', payload: navRoute }
    }
    const outputHandler = CAT_OUTPUT[target]
    if (outputHandler) {
      return outputHandler()
    }
    return { type: 'output', lines: [out(`cat: ${target}: No such file or directory`, 'text-destructive')] }
  },
}

const OPEN_FILES: Record<string, string> = {
  'resume.pdf': '/resume', './resume.pdf': '/resume',
}

const openCmd: CommandDef = {
  name: 'open',
  description: 'Open a file',
  handler: (args) => {
    const target = args[0]
    if (!target) {
      return { type: 'output', lines: [out('open: missing operand', 'text-destructive')] }
    }
    const route = OPEN_FILES[target]
    if (route) {
      return { type: 'action', action: 'navigate', payload: route }
    }
    return { type: 'output', lines: [out(`open: ${target}: No such file or directory`, 'text-destructive')] }
  },
}

const whoamiCmd: CommandDef = {
  name: 'whoami',
  description: 'Display current user',
  handler: () => ({ type: 'output', lines: [out(profile.name, 'text-primary font-bold')] }),
}

const uptimeCmd: CommandDef = {
  name: 'uptime',
  description: 'Show availability and experience',
  handler: () => ({
    type: 'output',
    lines: [out('● available · 9+ years · focus: AI agents', 'text-terminal')],
  }),
}

const pwdCmd: CommandDef = {
  name: 'pwd',
  description: 'Print working directory',
  handler: () => ({ type: 'output', lines: [out('/home/arka')] }),
}

const dateCmd: CommandDef = {
  name: 'date',
  description: 'Display current date/time',
  handler: () => ({ type: 'output', lines: [out(new Date().toString())] }),
}

const historyCmd: CommandDef = {
  name: 'history',
  description: 'Show command history',
  handler: (_args, ctx) => {
    if (ctx.history.length === 0) {
      return { type: 'output', lines: [out('No commands in history', 'text-muted-foreground')] }
    }
    return {
      type: 'output',
      lines: ctx.history.map((cmd, i) =>
        out(`  ${String(i + 1).padStart(4)}  ${cmd}`, 'text-foreground/80')
      ),
    }
  },
}

// ── Easter egg commands ────────────────────────────────────────────

const neofetchCmd: CommandDef = {
  name: 'neofetch',
  description: 'Display system information',
  handler: () => ({
    type: 'output',
    lines: [
      out(''),
      html('        <span class="text-primary">    ___    </span>   <span class="text-primary font-bold">arka</span>@<span class="text-primary font-bold">portfolio</span>'),
      html('        <span class="text-primary">   /   \\   </span>   ──────────────────'),
      html('        <span class="text-primary">  /     \\  </span>   <span class="text-primary">OS:</span> PortfolioOS (Next.js 15)'),
      html('        <span class="text-primary"> /  ___  \\ </span>   <span class="text-primary">Shell:</span> zsh 5.9'),
      html('        <span class="text-primary">/  /   \\  \\</span>   <span class="text-primary">Role:</span> Associate Architect @ Tekion'),
      html('        <span class="text-primary">\\  \\___/  /</span>   <span class="text-primary">Focus:</span> AI Agents & Platform Infra'),
      html('        <span class="text-primary"> \\       / </span>   <span class="text-primary">Stack:</span> ' + profile.skills.flatMap(c => c.items).length + ' packages'),
      html('        <span class="text-primary">  \\_____/  </span>   <span class="text-primary">Uptime:</span> 9+ years'),
      html('        <span class="text-primary">           </span>   <span class="text-primary">Terminal:</span> xterm-256color'),
      out(''),
      html('                   <span class="inline-block w-3 h-3 bg-[#e06c75] rounded-sm"></span> <span class="inline-block w-3 h-3 bg-[#e5c07b] rounded-sm"></span> <span class="inline-block w-3 h-3 bg-[#98c379] rounded-sm"></span> <span class="inline-block w-3 h-3 bg-[#61afef] rounded-sm"></span> <span class="inline-block w-3 h-3 bg-[#c678dd] rounded-sm"></span> <span class="inline-block w-3 h-3 bg-[#56b6c2] rounded-sm"></span>'),
      out(''),
    ],
  }),
}

const sudoHireCmd: CommandDef = {
  name: 'sudo hire arka',
  description: 'Execute hiring protocol',
  handler: () => ({
    type: 'output',
    lines: [
      out('[sudo] password for visitor: ********', 'text-muted-foreground'),
      out(''),
      out('✓ Excellent choice. Sending offer letter... 📧', 'text-terminal font-bold'),
      out(''),
      link('→ Connect on LinkedIn', profile.socialLinks.linkedin, 'text-primary'),
      link('→ Send an email', profile.socialLinks.email, 'text-primary'),
    ],
  }),
}

const manCmd: CommandDef = {
  name: 'man',
  description: 'Display manual page',
  handler: (args) => {
    const target = args[0]

    const contactLinks = [
      link('→ Connect on LinkedIn', profile.socialLinks.linkedin, 'text-primary'),
      link('→ Send an email', profile.socialLinks.email, 'text-primary'),
    ]

    const flagHandlers: Record<string, () => CommandResult> = {
      '--hire': () => ({ type: 'output', lines: [
        out('Initiating hiring protocol...', 'text-terminal'), out(''), ...contactLinks,
      ]}),
      '--collaborate': () => ({ type: 'output', lines: [
        out('Open to collaborations on:', 'text-terminal'),
        out('  • AI agent systems & LLM pipelines'),
        out('  • Platform infrastructure & distributed systems'),
        out('  • Open source projects'),
        out(''),
        link('→ GitHub', profile.socialLinks.github, 'text-primary'),
        link('→ Send an email', profile.socialLinks.email, 'text-primary'),
      ]}),
      '--chat': () => ({ type: 'output', lines: [
        out('Let\'s talk!', 'text-terminal'), out(''),
        link('→ DM on X/Twitter', profile.socialLinks.twitter, 'text-primary'),
        ...contactLinks,
      ]}),
    }

    if (target && flagHandlers[target]) {
      return flagHandlers[target]()
    }

    if (target === 'arka' || !target) {
      return {
        type: 'output',
        lines: [
          out('ARKA(1)                   Portfolio Manual                   ARKA(1)', 'text-primary font-bold'),
          out(''),
          out('NAME', 'text-primary font-bold'),
          out('    arka - Associate Architect & AI Engineer'),
          out(''),
          out('SYNOPSIS', 'text-primary font-bold'),
          out('    arka [--hire] [--collaborate] [--chat]'),
          out(''),
          out('DESCRIPTION', 'text-primary font-bold'),
          out('    A seasoned architect with 9+ years of experience building'),
          out('    distributed systems, AI agent pipelines, and platform'),
          out('    infrastructure. Currently at Tekion, focused on multi-agent'),
          out('    orchestration with LangGraph and Agno over RAG layers.'),
          out(''),
          out('OPTIONS', 'text-primary font-bold'),
          out('    --hire          Initiate the hiring process'),
          out('    --collaborate   Propose a project collaboration'),
          out('    --chat          Start a conversation'),
          out(''),
          out('SEE ALSO', 'text-primary font-bold'),
          link('    github.com/arkadyuti', profile.socialLinks.github, 'text-primary'),
          link('    linkedin.com/in/arkadyuti', profile.socialLinks.linkedin, 'text-primary'),
          out(''),
        ],
      }
    }
    return { type: 'output', lines: [out(`No manual entry for ${target}`, 'text-destructive')] }
  },
}

const matrixCmd: CommandDef = {
  name: 'matrix',
  description: 'Enter the Matrix',
  handler: () => ({ type: 'action', action: 'matrix' }),
}

const cowsayCmd: CommandDef = {
  name: 'cowsay',
  description: 'Make a cow say something',
  handler: (args) => {
    const message = args.length > 0 ? args.join(' ') : 'Moo! Hire Arka, he writes clean code!'
    const border = '-'.repeat(message.length + 2)
    return {
      type: 'output',
      lines: [
        out(` ${border}`),
        out(`< ${message} >`),
        out(` ${border}`),
        out('        \\   ^__^'),
        out('         \\  (oo)\\_______'),
        out('            (__)\\       )\\/\\'),
        out('                ||----w |'),
        out('                ||     ||'),
      ],
    }
  },
}

const fortunes = [
  '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"The best error message is the one that never shows up." — Thomas Fuchs',
  '"Simplicity is the soul of efficiency." — Austin Freeman',
  '"Talk is cheap. Show me the code." — Linus Torvalds',
  '"Programs must be written for people to read." — Harold Abelson',
  '"The most dangerous phrase is: We\'ve always done it this way." — Grace Hopper',
  '"Debugging is twice as hard as writing the code." — Brian Kernighan',
  '"It works on my machine." — Every developer ever',
  '"There are only two hard things in CS: cache invalidation and naming things." — Phil Karlton',
]

const fortuneCmd: CommandDef = {
  name: 'fortune',
  description: 'Display a random tech quote',
  handler: () => ({
    type: 'output',
    lines: [
      out(''),
      out(fortunes[Math.floor(Math.random() * fortunes.length)], 'text-primary/90 italic'),
      out(''),
    ],
  }),
}

const htopCmd: CommandDef = {
  name: 'htop',
  description: 'Show skill utilization',
  handler: () => {
    const skills: [string, number][] = [
      ['React/Next.js', 95],
      ['TypeScript', 92],
      ['AI/LLM Agents', 88],
      ['System Design', 90],
      ['Kubernetes/DevOps', 82],
      ['Node.js/Backend', 87],
      ['Python', 70],
      ['Golang', 65],
    ]

    const lines: OutputLine[] = [
      out('  PID USER      SKILL                  CPU%  [UTILIZATION]', 'text-primary font-bold'),
      out(''),
    ]

    skills.forEach(([name, pct], i) => {
      const barLen = Math.round(pct / 5)
      const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen)
      const color = pct >= 90 ? 'text-terminal' : pct >= 80 ? 'text-primary' : 'text-foreground/70'
      lines.push(
        out(
          `  ${String(i + 1).padStart(3)}  arka      ${name.padEnd(22)} ${String(pct).padStart(3)}%  [${bar}]`,
          color
        )
      )
    })

    lines.push(out(''))
    lines.push(out('  Tasks: 8 total, 8 running, 0 sleeping', 'text-muted-foreground'))
    lines.push(out(`  Uptime: 9+ years | Load avg: 0.42 0.38 0.35`, 'text-muted-foreground'))

    return { type: 'output', lines }
  },
}

// ── Registry ───────────────────────────────────────────────────────

const commandDefs: CommandDef[] = [
  helpCmd,
  clearCmd,
  lsCmd,
  cdCmd,
  catCmd,
  openCmd,
  whoamiCmd,
  uptimeCmd,
  pwdCmd,
  dateCmd,
  historyCmd,
  neofetchCmd,
  sudoHireCmd,
  manCmd,
  matrixCmd,
  cowsayCmd,
  fortuneCmd,
  htopCmd,
]

// Exported for autocomplete — derived from actual route/file maps, single source of truth
export const commandNames = commandDefs.map((c) => c.name)

// Preferred autocomplete forms — clean names only, no aliases like ./ or trailing /
export const completableStrings = [
  ...commandNames,
  'ls projects',
  'ls blogs',
  'cd home',
  'cd projects',
  'cd blogs',
  'cd about',
  'cat about.md',
  'cat resume.pdf',
  'cat role',
  'cat /etc/stack.conf',
  'open resume.pdf',
  'man arka',
  'man --hire',
  'man --collaborate',
  'man --chat',
  'sudo hire arka',
]

// Multi-word commands matched before splitting on spaces
const MULTI_WORD_CMDS: Record<string, CommandDef> = {
  'sudo hire arka': sudoHireCmd,
  'sudo hire': sudoHireCmd,
}

export function executeCommand(rawInput: string, context: CommandContext): CommandResult {
  const trimmed = rawInput.trim()
  if (!trimmed) {
    return { type: 'output', lines: [] }
  }

  const multiMatch = MULTI_WORD_CMDS[trimmed]
  if (multiMatch) {
    return multiMatch.handler([], context)
  }

  const parts = trimmed.split(/\s+/)
  const cmdName = parts[0]
  const args = parts.slice(1)

  const def = commandDefs.find((c) => c.name === cmdName)
  if (def) {
    return def.handler(args, context)
  }

  return {
    type: 'output',
    lines: [
      out(`bash: ${cmdName}: command not found. Type "help" for available commands.`, 'text-destructive'),
    ],
  }
}
