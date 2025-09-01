"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "@/lib/auth"
import { getUserProfile, type UserProfile } from "@/lib/firestore"

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  isConfigured: true, // Always configured now
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      setUser(user)

      if (user) {
        try {
          const profile = await getUserProfile(user.uid)
          setUserProfile(
            profile || {
              displayName: user.displayName || "User",
              role: "user",
              createdAt: new Date(),
            },
          )
        } catch (error) {
          console.error("Error fetching user profile:", error)
          setUserProfile({
            displayName: user.displayName || "User",
            role: "user",
            createdAt: new Date(),
          })
        }
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const isAdmin = userProfile?.role === "admin"

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, isConfigured: true }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
