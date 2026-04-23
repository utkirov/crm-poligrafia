export * from './database'
export * from './extended'

export interface AuthUser {
  id: string
  email: string | undefined
  name: string
  role: import('./database').UserRole
}
