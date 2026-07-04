import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'user' | 'god'
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthChecked: boolean
  isLoading: boolean

  setAuth: (user: AuthUser, token: string) => void
  setToken: (token: string) => void
  clearAuth: () => void
  setAuthChecked: (checked: boolean) => void
  setLoading: (loading: boolean) => void
}

function toAuthUser(user: { id: string; email: string; name: string; role: string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === 'god' ? 'god' : 'user',
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthChecked: false,
  isLoading: false,

  setAuth: (user, token) =>
    set({ user: toAuthUser(user), accessToken: token }),
  setToken: (token) => set({ accessToken: token }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setAuthChecked: (checked) => set({ isAuthChecked: checked }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
