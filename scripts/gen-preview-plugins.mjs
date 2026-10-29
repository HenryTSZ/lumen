import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 把 resources/plugins 下的示例插件打包进渲染层的预览数据里。
 * 这样浏览器预览页（没有主进程）也能真实安装并运行插件。
 * 用法：node scripts/gen-preview-plugins.mjs
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'resources', 'plugins')
const outFile = join(root, 'src', 'renderer', 'data', 'previewPlugins.ts')

const entries = []
for (const name of readdirSync(srcDir, { withFileTypes: true })) {
  if (!name.isDirectory()) continue
  const dir = join(srcDir, name.name)
  const meta = JSON.parse(readFileSync(join(dir, 'plugin.json'), 'utf8'))
  const code = readFileSync(join(dir, meta.main || 'index.js'), 'utf8')
  entries.push({ id: meta.id, info: meta, code })
}

const body = entries
  .map(
    ({ id, info, code }) =>
      `  ${JSON.stringify(id)}: {\n    info: ${JSON.stringify(info, null, 2).replace(/\n/g, '\n    ')},\n    code: ${JSON.stringify(code)}\n  }`
  )
  .join(',\n')

const file = `/**
 * 自动生成，请勿手改 —— 由 scripts/gen-preview-plugins.mjs 从 resources/plugins 生成。
 * 浏览器预览模式下用它代替主进程读取本地插件目录。
 */
import type { PluginInfo } from '@shared/types'

export interface PreviewPlugin {
  /** plugin.json 原文（安装后才会有 installed 字段） */
  info: Omit<PluginInfo, 'installed'>
  code: string
}

export const PREVIEW_PLUGINS: Record<string, PreviewPlugin> = {
${body}
}
`

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, file, 'utf8')
console.log(`已生成预览插件数据：${outFile}（${entries.length} 个插件）`)
