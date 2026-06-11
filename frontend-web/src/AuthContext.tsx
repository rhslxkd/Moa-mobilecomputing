import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { AuthAPI, TokenStore, type UserProfile } from './api'

interface AuthCtx {
  user: UserProfile | null
  loading: boolean
  fetchUser: () => Promise<void>
  setUser: (u: UserProfile | null) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, fetchUser: async () => {}, setUser: () => {}, logout: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const data = await AuthAPI.getMe()
      setUser(data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (TokenStore.get()) {
      fetchUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchUser])

  const logout = () => {
    TokenStore.clear()
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, fetchUser, setUser, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
