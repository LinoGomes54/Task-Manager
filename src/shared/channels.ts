/** Nomes dos canais IPC. Centralizados para o main e o preload nao divergirem. */
export const CHANNELS = {
  auth: {
    register: 'auth:register',
    login: 'auth:login',
    logout: 'auth:logout',
    getSession: 'auth:get-session'
  },
  tasks: {
    list: 'tasks:list',
    create: 'tasks:create',
    update: 'tasks:update',
    remove: 'tasks:remove',
    toggleComplete: 'tasks:toggle-complete',
    toggleImportant: 'tasks:toggle-important',
    stats: 'tasks:stats'
  },
  agenda: {
    list: 'agenda:list',
    add: 'agenda:add',
    remove: 'agenda:remove',
    reorder: 'agenda:reorder',
    setDuration: 'agenda:set-duration',
    applySchedule: 'agenda:apply-schedule'
  },
  categories: {
    list: 'categories:list',
    create: 'categories:create',
    update: 'categories:update',
    remove: 'categories:remove'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update'
  },
  sync: {
    getState: 'sync:get-state',
    runNow: 'sync:run-now'
  },
  system: {
    getAutoLaunch: 'system:get-auto-launch'
  },
  personalization: {
    get: 'personalization:get',
    getMedia: 'personalization:get-media',
    pick: 'personalization:pick',
    clear: 'personalization:clear'
  }
} as const

/** Eventos emitidos pelo main para o renderer. */
export const EVENTS = {
  syncStateChanged: 'event:sync-state-changed',
  dataChanged: 'event:data-changed',
  playAlarm: 'event:play-alarm',
  navigate: 'event:navigate'
} as const
