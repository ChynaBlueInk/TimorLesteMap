// hooks/useAuth.tsx
"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/firestore";

// Minimal "no-auth" user for MVP — includes `email` so profile page compiles
type AuthUser =
  | {
      uid: string;
      displayName?: string | null;
      email?: string | null;
      photoURL?: string | null;
    }
  | null;

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
