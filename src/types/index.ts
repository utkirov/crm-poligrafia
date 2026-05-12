export * from './database'
export * from './extended'
export * from './kpi'

export interface AuthUser {
  id: string
  email: string | undefined
  name: string
  role: import('./database').UserRole
  is_active?: boolean
}
