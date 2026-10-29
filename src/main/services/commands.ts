import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { UserCommand } from '@shared/types'
import { randomUUID } from 'node:crypto'
import { readJson, store, writeJson } from '../store'

const FILE = 'commands.json'

const SAMPLES: UserCommand[] = [
  {
    id: 'sample-hosts',
    name: '编辑 hosts 文件',
    keyword: 'hosts',
    type: 'open',
    target: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
    icon: '📝'
  },
  {
    id: 'sample-wsl',
    name: '打开 WSL 终端',
    keyword: 'wsl',
    type: 'shell',
    target: 'wt.exe -p "Ubuntu"',
    icon: '🐧'
  },
  {
    id: 'sample-email',
    name: '快速粘贴邮箱',
    keyword: 'mail',
    type: 'snippet',
    target: 'your.name@example.com',
    icon: '✉️'
  },
  {
    id: 'sample-github',
    name: 'GitHub Trending',
    keyword: 'gh',
    type: 'url',
    target: 'https://github.com/trending',
    icon: '🌐'
  }
]

/**
 * 用户自定义扩展命令。
 * 只需要在 <userData>/commands.json 里加一条 JSON，就能把任意动作接进启动器：
 *   { "name": "打开某某", "keyword": "xx", "type": "shell", "target": "code ." }
 */
export class UserCommandService {
  private commands: UserCommand[] = []

  load(): UserCommand[] {
    const file = join(store.dir, FILE)
    try {
      if (!existsSync(file)) {
        writeFileSync(file, JSON.stringify(SAMPLES, null, 2), 'utf8')
        this.commands = SAMPLES
        return this.commands
      }
      const raw = JSON.parse(readFileSync(file, 'utf8')) as UserCommand[]
      this.commands = raw.map((c) => ({ ...c, id: c.id || randomUUID() }))
      return this.commands
    } catch (error) {
      console.error('[commands] 解析失败，回落到内存缓存', error)
      this.commands = readJson<UserCommand[]>(FILE, [])
      return this.commands
    }
  }

  list(): UserCommand[] {
    return this.commands
  }

  save(list: UserCommand[]): UserCommand[] {
    this.commands = list.map((c) => ({ ...c, id: c.id || randomUUID() }))
    writeJson(FILE, this.commands)
    return this.commands
  }
}

export const userCommands = new UserCommandService()
