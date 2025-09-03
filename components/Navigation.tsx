"use client"

import {useState} from "react"
import Link from "next/link"
import {usePathname} from "next/navigation"
import {useAuth} from "@/hooks/useAuth"
import {signOutUser} from "@/lib/auth"
import {Button} from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Badge} from "@/components/ui/badge"
import {Map, Plus, UserIcon, Settings, LogOut, Globe, Menu, X, Search, NavigationIcon, Route, Compass} from "lucide-react"
import {useTranslation, type Language, getAvailableLanguages} from "@/lib/i18n"

interface NavigationProps {
  language?: Language
  onLanguageChange?: (language: Language)=>void
}

export default function Navigation({language="en", onLanguageChange}: NavigationProps){
  const {user, isAdmin} = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const {t} = useTranslation(language)

  const handleSignOut = async ()=>{
    try{ await signOutUser() }catch(err){ console.error("Error signing out:", err) }
  }

  // Helper to mark active on exact match or sub-routes (e.g., /trips and /trips/abc)
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const navItems = [
    {href: "/", label: "Home", icon: Compass},
    {href: "/map", label: "Browse Map", icon: Map},
    {href: "/search", label: "Search", icon: Search},
    {href: "/near-me", label: "Near Me", icon: NavigationIcon},
    {href: "/plan-trip", label: "Plan Trip", icon: Route},
    {href: "/trips", label: "Trips", icon: Route}, // ✅ NEW
    {href: "/submit", label: "Submit a Place", icon: Plus},
    {href: "/places", label: "Places", icon: Map},
  ]

  return (
    <nav className="sticky top-0 z-50 border-b bg-flag-gradient text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
              <span className="font-bold text-sm">HT</span>
            </div>
            <span className="font-semibold text-lg hidden sm:block drop-shadow">Harii Timor</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item)=>(
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 text-sm font-medium transition
                  ${isActive(item.href) ? "text-white drop-shadow" : "text-white/80 hover:text-white"}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Globe className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{language.toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="backdrop-blur bg-white/90">
                {getAvailableLanguages().map((lang)=>(
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={()=>onLanguageChange?.(lang.code)}
                    className={language===lang.code ? "bg-accent/40" : ""}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-white/10">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL||""} alt={user.displayName||""} />
                      <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 backdrop-blur bg-white/90" align="end" forceMount>
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col leading-none">
                      <p className="font-medium">{user.displayName || "User"}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                      {isAdmin ? <Badge variant="secondary" className="w-fit">Admin</Badge> : null}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserIcon className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Settings className="mr-2 h-4 w-4" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="bg-white text-tl-red hover:bg-white/90">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:bg-white/10"
              onClick={()=>setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen ? (
          <div className="md:hidden border-t border-white/20 py-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item)=>(
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md transition
                    ${isActive(item.href) ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"}`}
                  onClick={()=>setMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
