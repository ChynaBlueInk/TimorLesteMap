// components/ProtectedRoute.tsx
"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
};

/**
 * MVP stub: accepts auth-related props but just renders children.
 * This keeps pages compiling until real auth is added.
 */
export default function ProtectedRoute({ children }: Props) {
  return <>{children}</>;
}
