import type { LumenApi } from '@shared/types'
import { createMockApi } from './mock'

const bridge = (globalThis as unknown as { api?: LumenApi }).api

/**
 * 桥接入口。
 * Electron 环境走 preload 暴露的真实 IPC；
 * 纯浏览器（开发调试 / UI 预览）自动降级为 mock 数据，界面完全可用。
 */
export const api: LumenApi = bridge ?? createMockApi()

export const isPreviewMode = !bridge

export const typedApi = api as LumenApi
