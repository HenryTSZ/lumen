import { contextBridge, ipcRenderer } from 'electron'
import type { LumenApi } from '@shared/types'

/**
 * 安全桥接层：渲染层只能拿到这里显式暴露的方法。
 * contextIsolation 已开启，渲染进程本身没有任何 Node 能力。
 */
const invoke = <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>

const api: LumenApi = {
  launcher: {
    hide: () => invoke('launcher:hide'),
    resize: (size) => invoke('launcher:resize', size),
    paste: () => invoke('launcher:paste'),
    openSettingsWindow: () => invoke('settings:open-file')
  },

  settings: {
    getAll: () => invoke('settings:get'),
    set: (key, value) => invoke('settings:set', { [key]: value }),
    openFile: () => invoke('settings:open-file'),
    setHotkey: (accelerator) => invoke('settings:set-hotkey', accelerator),
    setAutoLaunch: (enabled) => invoke('settings:set-autolaunch', enabled)
  },

  apps: {
    list: () => invoke('apps:list'),
    rescan: () => invoke('apps:rescan'),
    icon: (pathOrAppId) => invoke('apps:icon', pathOrAppId),
    open: (target, useAppId = false) => invoke('apps:open', target, useAppId)
  },

  files: {
    status: () => invoke('files:status'),
    query: (query, limit) => invoke('files:query', query, limit),
    reindex: () => invoke('files:reindex'),
    decorate: (entry) => invoke('files:decorate', entry),
    open: (path) => invoke('files:open', path),
    reveal: (path) => invoke('files:reveal', path)
  },

  clipboard: {
    list: () => invoke('clip:list'),
    copy: (id) => invoke('clip:copy', id),
    write: (text) => invoke('clip:write', text),
    readText: () => invoke<string>('clip:read-now'),
    remove: (id) => invoke('clip:remove', id),
    clear: () => invoke('clip:clear'),
    togglePin: (id) => invoke('clip:toggle-pin', id),
    thumbnail: (id) => invoke<string>('clip:thumbnail', id),
    imageData: (id) => invoke<string>('clip:image-data', id),
    saveImage: (id) => invoke<string>('clip:save-image', id)
  },

  windows: {
    list: () => invoke('win:list'),
    focus: (pid) => invoke('win:focus', pid),
    close: (pid) => invoke('win:close', pid),
    snap: (pid, action) => invoke('win:snap', pid, action)
  },

  ports: {
    list: () => invoke('ports:list')
  },

  processes: {
    list: () => invoke('procs:list'),
    kill: (pid) => invoke('procs:kill', pid)
  },

  wifi: {
    list: () => invoke('wifi:list')
  },

  plugins: {
    market: () => invoke('plugins:market'),
    installed: () => invoke('plugins:installed'),
    code: (id) => invoke('plugins:code', id),
    install: (id) => invoke('plugins:install', id),
    uninstall: (id) => invoke('plugins:uninstall', id),
    setDisabled: (id, disabled) => invoke('plugins:set-disabled', id, disabled),
    dir: () => invoke('plugins:dir')
  },

  storage: {
    get: (key) => invoke('storage:get', key),
    set: (key, value) => invoke('storage:set', key, value),
    remove: (key) => invoke('storage:remove', key),
    keys: () => invoke('storage:keys')
  },

  system: {
    run: (action) => invoke('system:run', action),
    open: (target) => invoke('system:open', target)
  },

  commands: {
    list: () => invoke('commands:list'),
    reload: () => invoke('commands:reload')
  },

  shell: {
    openExternal: (url) => invoke('shell:external', url),
    run: (command, cwd) => invoke('shell:run', command, cwd)
  },

  browser: {
    bookmarks: () => invoke('browser:bookmarks')
  },

  ai: {
    chat: (prompt) => invoke('ai:chat', prompt)
  },

  quicklinks: {
    list: () => invoke('quicklinks:list'),
    save: (list) => invoke('quicklinks:save', list)
  },

  snippets: {
    list: () => invoke('snippets:list'),
    save: (list) => invoke('snippets:save', list)
  },

  app: {
    info: () => invoke('app:machine'),
    relaunch: () => invoke('app:relaunch')
  },

  usage: {
    all: () => invoke('usage:all'),
    record: (key) => invoke('usage:record', key),
    pin: (key, pinned) => invoke('usage:pin', key, pinned),
    reset: () => invoke('usage:reset')
  },

  on: (channel, listener) => {
    const subscription = (_event: unknown, ...args: unknown[]) => listener(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ExposedApi = typeof api
