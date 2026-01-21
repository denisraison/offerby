import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, ApiError } from '@/api/client'

interface User {
  id: number
  email: string
  name: string
}

interface LoginResponse {
  token: string
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function loadFromStorage() {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      token.value = storedToken
      try {
        user.value = JSON.parse(storedUser)
      } catch {
        clearStorage()
      }
    }
  }

  function clearStorage() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    token.value = null
    user.value = null
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    })

    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
  }

  async function register(email: string, password: string, name: string): Promise<void> {
    const response = await api.post<LoginResponse>('/auth/register', {
      email,
      password,
      name,
    })

    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore errors on logout
    }
    clearStorage()
  }

  function checkAuth(): boolean {
    loadFromStorage()
    return isAuthenticated.value
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    loadFromStorage,
  }
})

export { ApiError }
