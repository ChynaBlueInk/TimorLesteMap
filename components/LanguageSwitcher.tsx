"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { useTranslation, type Language, getAvailableLanguages } from "@/lib/i18n"

interface LanguageSwitcherProps {
  language: Language
  onLanguageChange: (language: Language) => void
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg"
  showLabel?: boolean
}

export default function LanguageSwitcher({
  language,
  onLanguageChange,
  variant = "ghost",
  size = "sm",
  showLabel = true,
}: LanguageSwitcherProps) {
  const { t } = useTranslation(language)
  const availableLanguages = getAvailableLanguages()

  const currentLanguage = availableLanguages.find((lang) => lang.code === language)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {showLabel && <span className="hidden sm:inline">{currentLanguage?.name || language.toUpperCase()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <span>{lang.name}</span>
              {language === lang.code && <div className="w-2 h-2 bg-primary rounded-full ml-2" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
