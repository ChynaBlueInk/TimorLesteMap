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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Search,
  Navigation as NavigationIcon,
  Route,
  Compass,
  Map,
  MapPin,
  Plus,
  ChevronDown,
} from "lucide-react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTripsOpen, setMobileTripsOpen] = useState(false);
  const [mobilePlacesOpen, setMobilePlacesOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const activeTrips = pathname?.startsWith("/trips") || pathname === "/plan-trip";
  const activePlaces =
    pathname === "/places" ||
    pathname === "/submit" ||
    pathname?.startsWith("/search");

  return (
    <nav className="sticky top-0 z-50 border-b bg-flag-gradient text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
              <span className="text-sm font-bold">HT</span>
            </div>
            <span className="hidden text-lg font-semibold drop-shadow sm:block">
              Harii Timor
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Home */}
            <Link
              href="/"
              aria-current={isActive("/") ? "page" : undefined}
              className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${
                isActive("/") ? "text-white drop-shadow" : "text-white/80 hover:text-white"
              }`}
            >
              <Compass className="h-4 w-4" />
              Home
            </Link>

            {/* Trips dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`group flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white ${
                    activeTrips ? "text-white drop-shadow" : ""
                  }`}
                >
                  <Route className="h-4 w-4" />
                  Trips
                  <ChevronDown className="h-4 w-4 transition group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/plan-trip" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add a new trip
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/trips/saved" className="flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    My saved trips
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/trips/public" className="flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    Public trips
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Places dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`group flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white ${
                    activePlaces ? "text-white drop-shadow" : ""
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Places
                  <ChevronDown className="h-4 w-4 transition group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/places" className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    View places
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/submit" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Submit a place
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/search" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Browse Map */}
            <Link
              href="/map"
              aria-current={isActive("/map") ? "page" : undefined}
              className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${
                isActive("/map")
                  ? "text-white drop-shadow"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <NavigationIcon className="h-4 w-4" />
              Browse Map
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
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
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition ${
                  isActive("/") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                }`}
              >
                <Compass className="h-4 w-4" />
                Home
              </Link>

              {/* Trips accordion */}
              <button
                className="flex items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                onClick={() => setMobileTripsOpen((v) => !v)}
                aria-expanded={mobileTripsOpen}
              >
                <span className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Trips
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition ${mobileTripsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobileTripsOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <Link
                    href="/plan-trip"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-md px-2 py-2 text-sm ${
                      isActive("/plan-trip") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    Add a new trip
                  </Link>
                  <Link
                    href="/trips/saved"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-md px-2 py-2 text-sm ${
                      isActive("/trips/saved") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    My saved trips
                  </Link>
                  <Link
                    href="/trips/public"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-md px-2 py-2 text-sm ${
                      isActive("/trips/public") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    Public trips
                  </Link>
                </div>
              )}

              {/* Places accordion */}
              <button
                className="flex items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                onClick={() => setMobilePlacesOpen((v) => !v)}
                aria-expanded={mobilePlacesOpen}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Places
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition ${mobilePlacesOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobilePlacesOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <Link
                    href="/places"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-md px-2 py-2 text-sm ${
                      isActive("/places") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    View places
                  </Link>
                  <Link
                    href="/submit"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-md px-2 py-2 text-sm ${
                      isActive("/submit") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    Submit a place
                  </Link>
                  <Link
                    href="/search"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-md px-2 py-2 text-sm ${
                      isActive("/search") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    Search
                  </Link>
                </div>
              )}

              {/* Browse Map */}
              <Link
                href="/map"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition ${
                  isActive("/map") ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10"
                }`}
              >
                <NavigationIcon className="h-4 w-4" />
                Browse Map
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
