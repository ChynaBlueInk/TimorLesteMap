// hooks/useAuth.tsx
"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/firestore";

// Minimal "no-auth" user type for MVP
type AuthUser = { uid: string; displayName?: string | null; photoURL?: string | null } | null;

/**
 * MVP stub: no Firebase, no real auth.
 * - user: always null
 * - isAdmin: false
 * - signIn/signOut: no-ops
 *
 * This keeps the app compiling while we focus on Places/Map/Submit.
 * Later, swap this hook for a real auth implementation.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading] = useState(false);

  const isAdmin = false;

  async function signIn() {
    // no-op for MVP
  }

  async function signOut() {
    setUser(null);
    setUserProfile(null);
  }

  return { user, userProfile, isAdmin, loading, signIn, signOut };
}
