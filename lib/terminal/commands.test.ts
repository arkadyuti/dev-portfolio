import { describe, it, expect } from 'vitest'
import { executeCommand, commandNames, completableStrings } from './commands'
import type { CommandContext } from './types'

const ctx: CommandContext = { history: [] }
const ctxWithHistory: CommandContext = { history: ['help', 'ls', 'whoami'] }

// ── helpers ────────────────────────────────────────────────────────────────

function exec(input: string, context: CommandContext = ctx) {
  return executeCommand(input, context)
}

// ── commandNames / completableStrings ──────────────────────────────────────

describe('commandNames', () => {
  it('contains core commands', () => {
    expect(commandNames).toContain('help')
    expect(commandNames).toContain('clear')
    expect(commandNames).toContain('ls')
    expect(commandNames).toContain('cd')
    expect(commandNames).toContain('cat')
    expect(commandNames).toContain('whoami')
    expect(commandNames).toContain('pwd')
  })

  it('does not contain empty strings', () => {
    expect(commandNames.every((n) => n.length > 0)).toBe(true)
  })
})

describe('completableStrings', () => {
  it('includes all command names', () => {
    for (const name of commandNames) {
      expect(completableStrings).toContain(name)
    }
  })

  it('includes common arg forms', () => {
    expect(completableStrings).toContain('cd projects')
    expect(completableStrings).toContain('ls blogs')
    expect(completableStrings).toContain('man arka')
    expect(completableStrings).toContain('sudo hire arka')
  })
})

// ── empty / whitespace input ───────────────────────────────────────────────

describe('executeCommand — empty input', () => {
  it('returns empty output for empty string', () => {
    const result = exec('')
    expect(result.type).toBe('output')
    if (result.type === 'output') expect(result.lines).toEqual([])
  })

  it('returns empty output for whitespace', () => {
    const result = exec('   ')
    expect(result.type).toBe('output')
    if (result.type === 'output') expect(result.lines).toEqual([])
  })
})

// ── unknown command ────────────────────────────────────────────────────────

describe('executeCommand — unknown command', () => {
  it('returns error output for unknown command', () => {
    const result = exec('foobar')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/command not found/)
      expect(result.lines[0].text).toMatch(/foobar/)
      expect(result.lines[0].color).toMatch(/destructive/)
    }
  })

  it('mentions "help" in the error message', () => {
    const result = exec('unknown-cmd')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/help/)
    }
  })
})

// ── help ──────────────────────────────────────────────────────────────────

describe('help command', () => {
  it('returns output type', () => {
    expect(exec('help').type).toBe('output')
  })

  it('lists at least one command', () => {
    const result = exec('help')
    if (result.type === 'output') {
      expect(result.lines.length).toBeGreaterThan(0)
    }
  })

  it('contains isHtml lines (for command list)', () => {
    const result = exec('help')
    if (result.type === 'output') {
      const htmlLine = result.lines.find((l) => l.isHtml)
      expect(htmlLine).toBeDefined()
    }
  })
})

// ── clear ─────────────────────────────────────────────────────────────────

describe('clear command', () => {
  it('returns action clear', () => {
    const result = exec('clear')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.action).toBe('clear')
  })
})

// ── ls ────────────────────────────────────────────────────────────────────

describe('ls command', () => {
  it('lists directory contents for bare ls', () => {
    const result = exec('ls')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      const texts = result.lines.map((l) => l.text)
      expect(texts).toContain('projects/')
      expect(texts).toContain('blogs/')
    }
  })

  it('lists directory contents for ls ./', () => {
    const result = exec('ls ./')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.some((l) => l.text === 'projects/')).toBe(true)
    }
  })

  it('provides hint for ls projects', () => {
    const result = exec('ls projects')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/cd projects/)
    }
  })

  it('provides hint for ls blogs', () => {
    const result = exec('ls blogs')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/cd blogs/)
    }
  })

  it('returns error for unknown directory', () => {
    const result = exec('ls nonexistent')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/No such file or directory/)
      expect(result.lines[0].color).toMatch(/destructive/)
    }
  })

  it('output lines have hrefs (links)', () => {
    const result = exec('ls')
    if (result.type === 'output') {
      expect(result.lines.some((l) => l.href)).toBe(true)
    }
  })
})

// ── cd ────────────────────────────────────────────────────────────────────

describe('cd command', () => {
  it('navigates to / with no arg', () => {
    const result = exec('cd')
    expect(result.type).toBe('action')
    if (result.type === 'action') {
      expect(result.action).toBe('navigate')
      expect(result.payload).toBe('/')
    }
  })

  it('navigates to / with ~', () => {
    const result = exec('cd ~')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.payload).toBe('/')
  })

  it('navigates to / with /', () => {
    const result = exec('cd /')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.payload).toBe('/')
  })

  it('navigates to /projects', () => {
    const result = exec('cd projects')
    expect(result.type).toBe('action')
    if (result.type === 'action') {
      expect(result.action).toBe('navigate')
      expect(result.payload).toBe('/projects')
    }
  })

  it('navigates to /blogs', () => {
    const result = exec('cd blogs')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.payload).toBe('/blogs')
  })

  it('navigates to /about', () => {
    const result = exec('cd about')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.payload).toBe('/about')
  })

  it('navigates to / for "home"', () => {
    const result = exec('cd home')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.payload).toBe('/')
  })

  it('returns error for unknown directory', () => {
    const result = exec('cd nowhere')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/No such file or directory/)
      expect(result.lines[0].color).toMatch(/destructive/)
    }
  })
})

// ── cat ───────────────────────────────────────────────────────────────────

describe('cat command', () => {
  it('navigates when given about.md', () => {
    const result = exec('cat about.md')
    expect(result.type).toBe('action')
    if (result.type === 'action') {
      expect(result.action).toBe('navigate')
      expect(result.payload).toBe('/about')
    }
  })

  it('navigates when given resume.pdf', () => {
    const result = exec('cat resume.pdf')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.payload).toBe('/resume')
  })

  it('outputs role content', () => {
    const result = exec('cat role')
    expect(result.type).toBe('output')
    if (result.type === 'output') expect(result.lines.length).toBeGreaterThan(0)
  })

  it('outputs stack.conf content', () => {
    const result = exec('cat /etc/stack.conf')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      // Last line should have package count comment
      const lastText = result.lines[result.lines.length - 1].text
      expect(lastText).toMatch(/packages loaded/)
    }
  })

  it('returns error for missing operand', () => {
    const result = exec('cat')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/missing operand/)
      expect(result.lines[0].color).toMatch(/destructive/)
    }
  })

  it('returns error for unknown file', () => {
    const result = exec('cat unknown.txt')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/No such file or directory/)
      expect(result.lines[0].color).toMatch(/destructive/)
    }
  })
})

// ── open ──────────────────────────────────────────────────────────────────

describe('open command', () => {
  it('navigates for resume.pdf', () => {
    const result = exec('open resume.pdf')
    expect(result.type).toBe('action')
    if (result.type === 'action') {
      expect(result.action).toBe('navigate')
      expect(result.payload).toBe('/resume')
    }
  })

  it('returns error for missing operand', () => {
    const result = exec('open')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/missing operand/)
    }
  })

  it('returns error for unknown file', () => {
    const result = exec('open secret.txt')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/No such file or directory/)
    }
  })
})

// ── whoami ────────────────────────────────────────────────────────────────

describe('whoami command', () => {
  it('returns output with profile name', () => {
    const result = exec('whoami')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text.length).toBeGreaterThan(0)
    }
  })
})

// ── pwd ───────────────────────────────────────────────────────────────────

describe('pwd command', () => {
  it('returns /home/arka', () => {
    const result = exec('pwd')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toBe('/home/arka')
    }
  })
})

// ── uptime ────────────────────────────────────────────────────────────────

describe('uptime command', () => {
  it('returns output mentioning years', () => {
    const result = exec('uptime')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/years/)
    }
  })
})

// ── date ──────────────────────────────────────────────────────────────────

describe('date command', () => {
  it('returns a non-empty date string', () => {
    const result = exec('date')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text.length).toBeGreaterThan(0)
    }
  })
})

// ── history ───────────────────────────────────────────────────────────────

describe('history command', () => {
  it('returns "No commands in history" when history is empty', () => {
    const result = exec('history', ctx)
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/No commands in history/)
    }
  })

  it('lists history entries when history is non-empty', () => {
    const result = exec('history', ctxWithHistory)
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.length).toBe(ctxWithHistory.history.length)
      expect(result.lines[0].text).toMatch(/help/)
    }
  })
})

// ── neofetch ──────────────────────────────────────────────────────────────

describe('neofetch command', () => {
  it('returns output lines including html', () => {
    const result = exec('neofetch')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.length).toBeGreaterThan(5)
      expect(result.lines.some((l) => l.isHtml)).toBe(true)
    }
  })
})

// ── sudo hire arka ────────────────────────────────────────────────────────

describe('sudo hire arka (multi-word command)', () => {
  it('matches full command', () => {
    const result = exec('sudo hire arka')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      const texts = result.lines.map((l) => l.text).join(' ')
      expect(texts).toMatch(/offer letter|Excellent choice/i)
    }
  })

  it('also matches "sudo hire" (alias)', () => {
    const result = exec('sudo hire')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      const texts = result.lines.map((l) => l.text).join(' ')
      expect(texts).toMatch(/offer letter|Excellent choice/i)
    }
  })
})

// ── man ───────────────────────────────────────────────────────────────────

describe('man command', () => {
  it('shows manual for "man arka"', () => {
    const result = exec('man arka')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.some((l) => l.text.includes('ARKA(1)'))).toBe(true)
    }
  })

  it('shows manual for bare "man"', () => {
    const result = exec('man')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.some((l) => l.text.includes('ARKA(1)'))).toBe(true)
    }
  })

  it('handles --hire flag', () => {
    const result = exec('man --hire')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.some((l) => l.text.match(/hiring|Initiating/i))).toBe(true)
    }
  })

  it('handles --collaborate flag', () => {
    const result = exec('man --collaborate')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.some((l) => l.text.match(/collaborat/i))).toBe(true)
    }
  })

  it('handles --chat flag', () => {
    const result = exec('man --chat')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines.some((l) => l.text.match(/talk|chat/i))).toBe(true)
    }
  })

  it('returns error for unknown man target', () => {
    const result = exec('man unknown')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      expect(result.lines[0].text).toMatch(/No manual entry/)
      expect(result.lines[0].color).toMatch(/destructive/)
    }
  })
})

// ── matrix ────────────────────────────────────────────────────────────────

describe('matrix command', () => {
  it('returns action matrix', () => {
    const result = exec('matrix')
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.action).toBe('matrix')
  })
})

// ── cowsay ────────────────────────────────────────────────────────────────

describe('cowsay command', () => {
  it('defaults to a message about hiring', () => {
    const result = exec('cowsay')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      const texts = result.lines.map((l) => l.text).join('\n')
      expect(texts).toMatch(/Moo/)
    }
  })

  it('uses provided arguments', () => {
    const result = exec('cowsay hello world')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      const texts = result.lines.map((l) => l.text).join('\n')
      expect(texts).toMatch(/hello world/)
    }
  })

  it('creates border of correct length', () => {
    const msg = 'test'
    const result = exec(`cowsay ${msg}`)
    if (result.type === 'output') {
      const border = result.lines[0].text.trim()
      // border is '-'.repeat(msg.length + 2)
      expect(border.length).toBe(msg.length + 2)
    }
  })
})

// ── fortune ───────────────────────────────────────────────────────────────

describe('fortune command', () => {
  it('returns a non-empty quote', () => {
    const result = exec('fortune')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      const text = result.lines.find((l) => l.text.trim().length > 0 && l.color?.match(/italic/))
      expect(text).toBeDefined()
    }
  })
})

// ── htop ──────────────────────────────────────────────────────────────────

describe('htop command', () => {
  it('returns skill list output', () => {
    const result = exec('htop')
    expect(result.type).toBe('output')
    if (result.type === 'output') {
      const texts = result.lines.map((l) => l.text).join('\n')
      expect(texts).toMatch(/TypeScript|React/)
    }
  })

  it('has a header and tasks footer', () => {
    const result = exec('htop')
    if (result.type === 'output') {
      const texts = result.lines.map((l) => l.text).join('\n')
      expect(texts).toMatch(/SKILL/)
      expect(texts).toMatch(/Tasks/)
    }
  })
})

// ── argument trimming / whitespace ────────────────────────────────────────

describe('whitespace handling', () => {
  it('trims leading/trailing whitespace before dispatch', () => {
    const result = exec('  pwd  ')
    expect(result.type).toBe('output')
    if (result.type === 'output') expect(result.lines[0].text).toBe('/home/arka')
  })

  it('handles extra spaces between command and args', () => {
    const result = exec('cd  projects')
    // Extra space: parts split on /\s+/ still works
    expect(result.type).toBe('action')
    if (result.type === 'action') expect(result.payload).toBe('/projects')
  })
})
