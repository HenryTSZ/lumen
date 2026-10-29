/**
 * 生成浏览器可直接打开的单文件预览页。
 * 把 vite 构建出的 JS / CSS 全部内联进 index.html，
 * 这样双击 file:// 打开也不会被 module CORS 限制。
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = new URL('../out/renderer', import.meta.url).pathname
const out = new URL('../../Lumen-preview.html', import.meta.url).pathname

let html = readFileSync(join(dist, 'index.html'), 'utf8')
// 预览页要把所有资源内联，去掉 Electron 用的 CSP（内联脚本会被它拦截）
html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '')
const assets = readdirSync(join(dist, 'assets'))

for (const file of assets) {
  const content = readFileSync(join(dist, 'assets', file), 'utf8')
  if (file.endsWith('.js')) {
    html = html.replace(
      new RegExp(`<script[^>]*src="[^"]*${file}"[^>]*></script>`),
      () => `<script type="module">${content}</script>`
    )
  } else if (file.endsWith('.css')) {
    html = html.replace(
      new RegExp(`<link[^>]*href="[^"]*${file}"[^>]*>`),
      () => `<style>${content}</style>`
    )
  }
}

mkdirSync(new URL('../..', import.meta.url).pathname, { recursive: true })
writeFileSync(out, html)
console.log(`已生成预览页：${out} (${(html.length / 1024).toFixed(0)} KB)`)

// 同步一份到 docs/index.html —— 它就是 GitHub Pages 的站点首页，避免两边漂移
const docsDir = new URL('../docs/', import.meta.url).pathname
if (existsSync(docsDir)) {
  writeFileSync(join(docsDir, 'index.html'), html)
  console.log('已同步到 docs/index.html（GitHub Pages 首页）')
}
