"use client"

import { useState } from "react"
import { Search, Filter, X, Calendar, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

export interface SearchFilters {
  query: string
  categories: string[]
  municipalities: string[]
  featured: boolean
  hasImages: boolean
  yearRange: [number, number]
  // NOTE: useSearch supports "relevance" | "newest" | "oldest" | "title"
  sortBy: "relevance" | "newest" | "oldest" | "title"
}

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  municipalities: string[]
  className?: string
}

const categories = [
  { id: "history", label: "History", icon: "🏛️" },
  { id: "culture", label: "Culture", icon: "🎭" },
  { id: "nature", label: "Nature", icon: "🌿" },
  { id: "food", label: "Food", icon: "🍽️" },
  // Map UI "memorials" to data "memorial"
  { id: "memorials", label: "Memorials", icon: "🕊️" },
]

const sortOptions = [
  { value: "relevance", label: "Most Relevant" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "title", label: "A–Z" }, // value must be "title" to match useSearch
]

export default function SearchFilters({
  filters,
  onFiltersChange,
  municipalities,
  className = "",
}: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const normalizeCategories = (cats: string[]) =>
    cats.map((c) => (c === "memorials" ? "memorial" : c))

  const updateFilters = (updates: Partial<SearchFilters>) => {
    // If categories are present in updates, normalize "memorials" -> "memorial"
    const fixed =
      updates.categories
        ? { ...updates, categories: normalizeCategories(updates.categories) }
        : updates

    onFiltersChange({ ...filters, ...fixed })
  }

  const toggleCategory = (categoryId: string) => {
    // convert UI id to data key before toggling
    const dataKey = categoryId === "memorials" ? "memorial" : categoryId
    const newCategories = filters.categories.includes(dataKey)
      ? filters.categories.filter((id) => id !== dataKey)
      : [...filters.categories, dataKey]
    updateFilters({ categories: newCategories })
  }

  const toggleMunicipality = (municipality: string) => {
    const newMunicipalities = filters.municipalities.includes(municipality)
      ? filters.municipalities.filter((m) => m !== municipality)
      : [...filters.municipalities, municipality]
    updateFilters({ municipalities: newMunicipalities })
  }

  const clearFilters = () => {
    onFiltersChange({
      query: "",
      categories: [],
      municipalities: [],
      featured: false,
      hasImages: false,
      yearRange: [1500, 2024],
      sortBy: "relevance",
    })
  }

  const activeFiltersCount =
    filters.categories.length +
    filters.municipalities.length +
    (filters.featured ? 1 : 0) +
    (filters.hasImages ? 1 : 0) +
    (filters.yearRange[0] !== 1500 || filters.yearRange[1] !== 2024 ? 1 : 0)

  // For chips, we want to display the UI label, so map back "memorial" -> "memorials"
  const displayCategoryId = (dataKey: string) =>
    dataKey === "memorial" ? "memorials" : dataKey

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search places, stories, locations..."
          value={filters.query}
          onChange={(e) => updateFilters({ query: e.target.value })}
          className="pl-10 pr-4"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={showAdvanced ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Category Quick Filters */}
        {categories.map((category) => {
          // check active state using data key
          const dataKey = category.id === "memorials" ? "memorial" : category.id
          const isActive = filters.categories.includes(dataKey)
          return (
            <Button
              key={category.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => toggleCategory(category.id)}
              className="flex items-center gap-1"
            >
              <span>{category.icon}</span>
              {category.label}
            </Button>
          )
        })}

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sort By */}
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: "relevance" | "newest" | "oldest" | "title") =>
                    updateFilters({ sortBy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value as any}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Municipalities */}
              <div>
                <label className="text-sm font-medium mb-2 block">Municipalities</label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {municipalities.map((municipality) => (
                    <div key={municipality} className="flex items-center space-x-2">
                      <Checkbox
                        id={municipality}
                        checked={filters.municipalities.includes(municipality)}
                        onCheckedChange={() => toggleMunicipality(municipality)}
                      />
                      <label
                        htmlFor={municipality}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {municipality}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Year Range */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Time Period: {filters.yearRange[0]} - {filters.yearRange[1]}
              </label>
              <Slider
                value={filters.yearRange}
                onValueChange={(value) => updateFilters({ yearRange: value as [number, number] })}
                min={1500}
                max={2024}
                step={10}
                className="w-full"
              />
            </div>

            {/* Special Filters */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={filters.featured}
                  onCheckedChange={(checked) => updateFilters({ featured: !!checked })}
                />
                <label htmlFor="featured" className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Featured places only
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasImages"
                  checked={filters.hasImages}
                  onCheckedChange={(checked) => updateFilters({ hasImages: !!checked })}
                />
                <label htmlFor="hasImages" className="text-sm font-medium">
                  Places with images only
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map((dataKey) => {
            const uiId = displayCategoryId(dataKey)
            const category = categories.find((c) => c.id === uiId)
            return (
              <Badge key={dataKey} variant="secondary" className="flex items-center gap-1">
                <span>{category?.icon}</span>
                {category?.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleCategory(uiId)} />
              </Badge>
            )
          })}

          {filters.municipalities.map((municipality) => (
            <Badge key={municipality} variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {municipality}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleMunicipality(municipality)} />
            </Badge>
          ))}

          {filters.featured && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Featured
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ featured: false })} />
            </Badge>
          )}

          {filters.hasImages && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Images
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ hasImages: false })} />
            </Badge>
          )}

          {(filters.yearRange[0] !== 1500 || filters.yearRange[1] !== 2024) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {filters.yearRange[0]} - {filters.yearRange[1]}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ yearRange: [1500, 2024] })} />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
