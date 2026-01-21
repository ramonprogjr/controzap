import { create } from 'zustand'

interface AuthState {
    user: any | null
    session: any | null
    permissions: string[]
    role: string | null
    setUser: (user: any) => void
    setSession: (session: any) => void
    setPermissions: (permissions: string[]) => void
    setRole: (role: string) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    permissions: [],
    role: null,
    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setPermissions: (permissions) => set({ permissions }),
    setRole: (role) => set({ role }),
    clearAuth: () => set({ user: null, session: null, permissions: [], role: null }),
}))
