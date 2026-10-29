/**
 * electron-vite 配置
 * main / preload 以 commonjs 输出给 Electron 主进程与 preload 使用，
 * renderer 是标准 React SPA。
 */
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const root = __dirname

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(root, 'src/shared')
      }
    },
    build: {
      outDir: 'out/main',
      emptyOutDir: true,
      lib: {
        entry: resolve(root, 'src/main/index.ts'),
        formats: ['cjs'],
        fileName: () => 'index.cjs'
      },
      rollupOptions: {
        input: resolve(root, 'src/main/index.ts'),
        output: { entryFileNames: 'index.cjs' }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(root, 'src/shared')
      }
    },
    build: {
      outDir: 'out/preload',
      emptyOutDir: true,
      lib: {
        entry: resolve(root, 'src/preload/index.ts'),
        formats: ['cjs'],
        fileName: () => 'index.cjs'
      },
      rollupOptions: {
        input: resolve(root, 'src/preload/index.ts'),
        output: { entryFileNames: 'index.cjs' }
      }
    }
  },
  renderer: {
    root: resolve(root, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve(root, 'src/renderer'),
        '@shared': resolve(root, 'src/shared')
      }
    },
    build: {
      outDir: resolve(root, 'out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(root, 'src/renderer/index.html')
      }
    },
    server: {
      port: 5173
    }
  }
})
