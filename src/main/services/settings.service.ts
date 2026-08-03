import { queryOne, execute, now, toBool } from '../db/local'
import type { AppSettings, ThemePreference } from '@shared/types'

type Row = Record<string, unknown>

function mapSettings(row: Row): AppSettings {
  return {
    userId: String(row.user_id),
    autoLaunch: toBool(row.auto_launch),
    startMinimized: toBool(row.start_minimized),
    closeToTray: toBool(row.close_to_tray),
    notificationsEnabled: toBool(row.notifications_enabled),
    soundEnabled: toBool(row.sound_enabled),
    reminderLeadMinutes: Number(row.reminder_lead_minutes),
    theme: String(row.theme) as ThemePreference,
    updatedAt: String(row.updated_at)
  }
}

/** Le as configuracoes do usuario, criando o registro padrao se ainda nao existir. */
export function getSettings(userId: string): AppSettings {
  const row = queryOne<Row>('SELECT * FROM user_settings WHERE user_id = ?', [userId])
  if (row) return mapSettings(row)

  createDefaultSettings(userId)
  return mapSettings(queryOne<Row>('SELECT * FROM user_settings WHERE user_id = ?', [userId])!)
}

export function createDefaultSettings(userId: string): void {
  const timestamp = now()
  execute(
    `INSERT OR IGNORE INTO user_settings (user_id, created_at, updated_at, dirty)
     VALUES (?, ?, ?, 1)`,
    [userId, timestamp, timestamp]
  )
}

const EDITABLE = {
  autoLaunch: 'auto_launch',
  startMinimized: 'start_minimized',
  closeToTray: 'close_to_tray',
  notificationsEnabled: 'notifications_enabled',
  soundEnabled: 'sound_enabled',
  reminderLeadMinutes: 'reminder_lead_minutes',
  theme: 'theme'
} as const

export function updateSettings(userId: string, patch: Partial<AppSettings>): AppSettings {
  getSettings(userId) // garante que a linha existe

  const assignments: string[] = []
  const params: unknown[] = []

  for (const [key, column] of Object.entries(EDITABLE)) {
    const value = patch[key as keyof typeof EDITABLE]
    if (value === undefined) continue
    assignments.push(`${column} = ?`)
    params.push(value)
  }

  if (assignments.length > 0) {
    assignments.push('updated_at = ?', 'dirty = 1')
    params.push(now(), userId)
    execute(`UPDATE user_settings SET ${assignments.join(', ')} WHERE user_id = ?`, params)
  }

  return getSettings(userId)
}
