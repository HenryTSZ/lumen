import { globalShortcut } from 'electron'
import type { AppSettings } from '@shared/types'

/**
 * 全局快捷键注册（主进程侧）。
 * 主唤起键 + 用户给「搜索词」绑定的命令快捷键。
 * 注册失败（组合键被其他程序占用）不抛异常，而是收集后反馈。
 * 纯工具函数在 @shared/hotkeys，供渲染层表单校验复用。
 */

export interface HotkeyCallbacks {
  toggleLauncher(): void
  /** 命令快捷键命中：显示窗口并让渲染层执行对应搜索 */
  runCommand(query: string): void
}

export interface HotkeyApplyResult {
  /** 实际生效的唤起键（占用时会自动降级到候选组合） */
  launcherKey: string
  /** 注册失败的命令快捷键 accelerator 列表 */
  failed: string[]
}

/** 唤起键被占用时的降级候选 */
const LAUNCHER_FALLBACKS = ['Ctrl+Space', 'Alt+Space', 'Ctrl+Alt+Space']

/** （重新）注册所有快捷键：主唤起键 + 命令快捷键 */
export function applyHotkeys(settings: AppSettings, callbacks: HotkeyCallbacks): HotkeyApplyResult {
  globalShortcut.unregisterAll()

  const preferred = settings.hotkey || 'Alt+Space'
  let launcherKey = ''
  for (const candidate of [preferred, ...LAUNCHER_FALLBACKS]) {
    if (!candidate) continue
    try {
      if (globalShortcut.register(candidate, () => callbacks.toggleLauncher())) {
        launcherKey = candidate
        break
      }
    } catch {
      /* 被占用，试下一个 */
    }
  }
  if (!launcherKey) {
    console.warn('[hotkeys] 所有候选快捷键都被占用，请手动在设置中更换')
  }

  const failed: string[] = []
  const used = new Set<string>([launcherKey])
  for (const binding of settings.commandHotkeys ?? []) {
    const accelerator = binding.accelerator
    if (!accelerator || used.has(accelerator)) {
      if (accelerator) failed.push(accelerator)
      continue
    }
    try {
      const ok = globalShortcut.register(accelerator, () => callbacks.runCommand(binding.query))
      if (ok) used.add(accelerator)
      else failed.push(accelerator)
    } catch {
      failed.push(accelerator)
    }
  }

  return { launcherKey, failed }
}
