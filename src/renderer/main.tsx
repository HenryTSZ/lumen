import { createRoot } from 'react-dom/client'
import App from './App'
import { isPreviewMode } from './api'
import './styles.css'

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(<App />)
}

// 纯浏览器预览：加舞台背景与提示条（Electron 里不会执行）
if (isPreviewMode) {
  document.body.classList.add('preview')
  const hint = document.createElement('div')
  hint.className = 'preview-hint'
  hint.textContent =
    '浏览器预览 · 模拟数据 · 试试输入：app ／ clip ／ w ／ 12*35+sin(pi/2) ／ sys ／ 设置 ／ https://github.com'
  document.body.appendChild(hint)
}
