import { useAuthStore } from '../hooks/useAuthStore'

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3000'
)

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) return null
      const data = await response.json()
      if (data.accessToken) {
        useAuthStore.getState().setToken(data.accessToken)
        return data.accessToken as string
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function apiRequest(path: string, options: RequestInit = {}, isRetry = false): Promise<unknown> {
  const token = useAuthStore.getState().accessToken
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const method = (options.method ?? 'GET').toUpperCase()
  if (method === 'POST' || method === 'PATCH') {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && path !== '/auth/refresh' && !isRetry) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      return apiRequest(path, options, true)
    }
    useAuthStore.getState().clearAuth()
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const errBody = await response.json()
      if (typeof errBody.message === 'string') {
        message = errBody.message
      } else if (Array.isArray(errBody.message)) {
        message = errBody.message.join(', ')
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, message)
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json()
  }
  return null
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  refresh: () => apiRequest('/auth/refresh', { method: 'POST' }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/auth/me'),
}

export const roomsApi = {
  mine: () => apiRequest('/rooms/mine'),
  participated: () => apiRequest('/rooms/participated'),
  all: () => apiRequest('/rooms'),
  delete: (id: string) => apiRequest(`/rooms/${id}`, { method: 'DELETE' }),
}

export const usersApi = {
  all: () => apiRequest('/users'),
  getById: (id: string) => apiRequest(`/users/${id}`),
  updateMe: (data: { name?: string; password?: string; currentPassword?: string }) =>
    apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
}
