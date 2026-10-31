import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * 单元测试配置。
 * 只覆盖纯算法模块（模糊匹配 / 表达式求值 / 单位换算 / 数据解析），
 * 不启动 Electron，也不需要 jsdom —— 保证 `npm test` 在任何机器上几秒内跑完。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer')
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['src/renderer/engine/**/*.ts', 'src/main/services/**/*.ts', 'src/renderer/data/**/*.ts'],
      exclude: ['**/types.ts', '**/*.d.ts', 'src/renderer/data/previewPlugins.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage'
    }
  }
})
