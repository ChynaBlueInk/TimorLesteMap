"use client"

import {useState} from "react"
import Link from "next/link"
import {usePathname} from "next/navigation"
import {Button} from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Globe, Menu, X, Search, NavigationIcon, Route, Compass, Map, Plus} from "lucide-react"
import {useTranslation, type Language, getAvailableLanguages} from "@/lib/i18n"

interface NavigationProps {
  language?: Language
  onLanguageChange?: (language: Language)=>void
}

export default function Navigation({language="en", onLanguageChange}: NavigationProps){
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const {t} = useTranslation(language)

  // Active path highlighter that also matches subroutes (e.g., /trips/abc)
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
    {href: "/trips", label: "Trips", icon: Route},
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

          {/* Right side: Language + Mobile menu */}
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
