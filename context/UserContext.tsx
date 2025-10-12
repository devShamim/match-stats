'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/api'
import { UserProfile } from '@/types'

interface UserContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isApproved: boolean
  isPending: boolean
  refreshUserProfile: () => Promise<void>
  forceRefresh: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string) => {
    try {
      // Force fresh session and clear any cached auth state
      const { data: { session: freshSession } } = await supabase.auth.getSession()

      if (!freshSession) {
        setUserProfile(null)
        return
      }

      // Use cache-busting approach for user profile
      const profile = await getUserProfile(userId)
      setUserProfile(profile)

      // Force a small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }

      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
      // Clear local state immediately
      setUser(null)
      setSession(null)
      setUserProfile(null)
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }

  const refreshUserProfile = async () => {
    if (user) {
      // Force clear all cached state first
      setUserProfile(null)
      setLoading(true)

      // Force fresh session
      const { data: { session: freshSession } } = await supabase.auth.getSession()

      if (freshSession?.user) {
        await fetchUserProfile(freshSession.user.id)
      }

      setLoading(false)
    }
  }

  // Add a force refresh function that clears everything
  const forceRefresh = async () => {
    setLoading(true)
    setUserProfile(null)

    // Force fresh session
    const { data: { session: freshSession } } = await supabase.auth.getSession()
    setSession(freshSession)
    setUser(freshSession?.user ?? null)

    if (freshSession?.user) {
      await fetchUserProfile(freshSession.user.id)
    }

    setLoading(false)
  }

  // Computed properties
  const isAdmin = userProfile?.role === 'admin' && userProfile?.status === 'approved'
  const isApproved = userProfile?.status === 'approved'
  const isPending = userProfile?.status === 'pending'

  const value = {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isApproved,
    isPending,
    refreshUserProfile,
    forceRefresh,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
