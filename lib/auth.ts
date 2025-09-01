export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export interface AuthResult {
  user: User
}

// Mock user for demo purposes
const mockUser: User = {
  uid: "demo-user",
  email: "demo@example.com",
  displayName: "Demo User",
  photoURL: null,
}

let currentUser: User | null = null
let authStateListeners: ((user: User | null) => void)[] = []

export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (email === "demo@example.com" && password === "password") {
    currentUser = { ...mockUser, email }
    authStateListeners.forEach((listener) => listener(currentUser))
    return { user: currentUser }
  }

  throw new Error("Invalid email or password")
}

export const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  currentUser = {
    uid: `user-${Date.now()}`,
    email,
    displayName,
    photoURL: null,
  }

  authStateListeners.forEach((listener) => listener(currentUser))
  return { user: currentUser }
}

export const signInWithGoogle = async (): Promise<AuthResult> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  currentUser = {
    uid: "google-user",
    email: "google@example.com",
    displayName: "Google User",
    photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c",
  }

  authStateListeners.forEach((listener) => listener(currentUser))
  return { user: currentUser }
}

export const signOutUser = async (): Promise<void> => {
  currentUser = null
  authStateListeners.forEach((listener) => listener(null))
}

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  authStateListeners.push(callback)
  // Call immediately with current state
  setTimeout(() => callback(currentUser), 0)

  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter((listener) => listener !== callback)
  }
}

export const createUserProfile = async (user: User, additionalData?: any) => {
  // In a real app, this would save to a database
  console.log("Creating user profile:", { user, additionalData })
  return Promise.resolve()
}
