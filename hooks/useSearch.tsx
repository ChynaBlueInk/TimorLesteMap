// hooks/useSearch.tsx
"use client"

import {useEffect, useMemo, useState} from "react"
import {getPlaces, searchPlaces, type Place} from "@/lib/firestore"

type Filters = {
  query?: string
  categories?: string[]
  municipalities?: string[]
  featured?: boolean
  hasImages?: boolean
  yearRange?: [number, number]
  sortBy?: "relevance"|"newest"|"oldest"|"title"
}

const uniqueMunicipalities = (places: Place[])=>{
  const set = new Set<string>()
  for(const p of places){ if(p.municipality){ set.add(p.municipality) } }
  return Array.from(set).sort((a,b)=>a.localeCompare(b))
}

const applyFilters = (places: Place[], f: Filters)=>{
  let out = places

  // categories (any matches)
  if(Array.isArray(f.categories) && f.categories.length>0){
    const set = new Set(f.categories)
    out = out.filter((p)=>set.has(p.category))
  }

  // municipalities (any matches)
  if(Array.isArray(f.municipalities) && f.municipalities.length>0){
    const set = new Set(f.municipalities.map((m)=>m.toLowerCase()))
    out = out.filter((p)=> p.municipality ? set.has(p.municipality.toLowerCase()) : false)
  }

  // featured (only filter when explicitly true)
  if(f.featured===true){
    out = out.filter((p)=>p.featured===true)
  }


  // hasImages
  if(typeof f.hasImages==="boolean" && f.hasImages){
    out = out.filter((p)=>Array.isArray(p.images) && p.images.length>0)
  }

  // yearRange
  if(Array.isArray(f.yearRange)){
    const [from,to] = f.yearRange
    out = out.filter((p)=>{
      const pf = p.period?.fromYear
      const pt = p.period?.toYear
      const okFrom = typeof from==="number" ? (pf==null || pf>=from) : true
      const okTo = typeof to==="number" ? (pt==null || pt<=to) : true
      return okFrom && okTo
    })
  }

  // sort
  switch(f.sortBy){
    case "newest":
      out = out.slice().sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0))
      break
    case "oldest":
      out = out.slice().sort((a,b)=> (a.updatedAt||0)-(b.updatedAt||0))
      break
    case "title":
      out = out.slice().sort((a,b)=> a.title.localeCompare(b.title))
      break
    default: /* relevance (noop for now) */ break
  }

  return out
}

export function useSearch(initial: Filters){
  const [filters, setFilters] = useState<Filters>(initial||{})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|undefined>(undefined)
  const [base, setBase] = useState<Place[]>([])

  useEffect(()=>{
    let cancelled = false
    const run = async ()=>{
      setLoading(true); setError(undefined)
      try{
        const q = (filters.query||"").trim()
        const data = q ? await searchPlaces(q) : await getPlaces()
        if(cancelled) return
        setBase(data||[])
      }catch(err:any){
        if(cancelled) return
        setError(err?.message||"Failed to load places")
      }finally{
        if(!cancelled) setLoading(false)
      }
    }
    run()
    // re-run when query changes
  },[filters.query])

  const places = useMemo(()=>applyFilters(base||[], filters||{}), [base, filters])
  const municipalities = useMemo(()=>uniqueMunicipalities(base||[]), [base])
  const totalResults = places.length

  return {filters, setFilters, places, municipalities, loading, error, totalResults}
}

export default useSearch
