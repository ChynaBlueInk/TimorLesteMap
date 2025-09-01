// components/Reviews.tsx
"use client"

import {useEffect, useState} from "react"
import {addReview, getPlaceRatingSummary, getReviews, type Review} from "@/lib/firestore"
import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {Star} from "lucide-react"

type Props = { placeId: string }

const Stars = ({value}:{value: number})=>{
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({length:5}).map((_,i)=>(
        <Star key={i} className={`h-4 w-4 ${i<value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  )
}

export default function Reviews({placeId}: Props){
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<{count: number, average: number}>({count: 0, average: 0})
  const [author, setAuthor] = useState("")
  const [rating, setRating] = useState<1|2|3|4|5>(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string|undefined>(undefined)

  const load = async ()=>{
    const [rs, sum] = await Promise.all([getReviews(placeId), getPlaceRatingSummary(placeId)])
    setReviews(rs); setSummary(sum)
  }

  useEffect(()=>{ load() },[placeId])

  const onSubmit = async ()=>{
    setError(undefined)
    const trimmed = comment.trim()
    if(!trimmed){ setError("Please add a short comment."); return }
    setSubmitting(true)
    try{
      await addReview({placeId, rating, comment: trimmed, author: author.trim()||undefined})
      setAuthor(""); setComment(""); setRating(5)
      await load()
    }catch(err:any){
      setError(err?.message||"Failed to submit review.")
    }finally{
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Reviews</h3>
              <p className="text-sm text-muted-foreground">
                {summary.count>0 ? `${summary.average}★ average · ${summary.count} review${summary.count>1?"s":""}` : "No reviews yet"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {reviews.length===0 ? (
              <p className="text-sm text-muted-foreground">Be the first to leave a review.</p>
            ) : reviews.map((r)=>(
              <div key={r.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-xs">{r.author||"Anonymous"}</span>
                </div>
                <p className="mt-2 text-sm">{r.comment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 md:p-6">
          <h4 className="font-medium mb-3">Add your review</h4>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Your name (optional)" value={author} onChange={(e)=>setAuthor(e.target.value)} />
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Rating</label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((n)=>(
                    <button
                      key={n}
                      type="button"
                      onClick={()=>setRating(n as 1|2|3|4|5)}
                      className={`p-1 rounded ${rating>=n?"text-yellow-500":"text-muted-foreground"} hover:bg-accent`}
                      aria-label={`Rate ${n}`}
                    >
                      <Star className={`h-5 w-5 ${rating>=n?"fill-yellow-400 text-yellow-400":""}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Textarea placeholder="What did you think?" value={comment} onChange={(e)=>setComment(e.target.value)} />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
              <Button onClick={onSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
