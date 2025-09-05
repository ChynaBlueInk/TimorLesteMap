// components/Navigation.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  Menu,
  X,
  Search,
  Navigation as NavigationIcon, // lucide: Navigation / Navigation2
  Route,
  Compass,
  Map,
  Plus,
} from "lucide-react";
import { useTranslation, type Language, getAvailableLanguages } from "@/lib/i18n";

interface NavigationProps {
  language?: Language;
  onLanguageChange?: (language: Language) => void;
}

export default function Navigation({ language = "en", onLanguageChange }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation(language);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  // 👇 Both Map (interactive) and Places (list with filters)
  const navItems = [
    { href: "/", label: "Home", icon: Compass },
    { href: "/map", label: "Map", icon: Map },          // ✅ Map page
    { href: "/places", label: "Places", icon: Map },    // ✅ Places list
    { href: "/search", label: "Search", icon: Search },
    { href: "/near-me", label: "Near Me", icon: NavigationIcon },
    { href: "/plan-trip", label: "Plan Trip", icon: Route },
    { href: "/trips", label: "Trips", icon: Route },
    { href: "/submit", label: "Submit a Place", icon: Plus },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-flag-gradient text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
              <span className="text-sm font-bold">HT</span>
            </div>
            <span className="hidden text-lg font-semibold drop-shadow sm:block">Harii Timor</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => {
              const ActiveIcon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1 text-sm font-medium transition ${
                    active ? "text-white drop-shadow" : "text-white/80 hover:text-white"
                  }`}
                >
                  <ActiveIcon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Lang + Mobile button */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Globe className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">{language.toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur">
                {getAvailableLanguages().map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => onLanguageChange?.(lang.code)}
                    className={language === lang.code ? "bg-accent/40" : ""}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 md:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen ? (
          <div id="mobile-nav" className="md:hidden border-t border-white/20 py-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const ActiveIcon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition ${
                      active ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ActiveIcon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
