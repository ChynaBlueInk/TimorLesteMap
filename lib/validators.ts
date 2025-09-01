import { z } from "zod"

export const placeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().min(50, "Description must be at least 50 characters").max(2000, "Description too long"),
  category: z.enum(["history", "culture", "nature", "food", "memorials"]),
  municipality: z.string().min(1, "Municipality is required"),
  suco: z.string().min(1, "Suco is required"),
  coords: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  images: z.array(z.string()).max(5, "Maximum 5 images allowed"),
  sources: z.array(z.string().url("Invalid URL")).optional(),
  languages: z.array(z.enum(["tet", "en", "pt"])).min(1, "At least one language required"),
  period: z
    .object({
      fromYear: z.number().optional(),
      toYear: z.number().optional(),
    })
    .optional(),
})

export const reportSchema = z.object({
  placeId: z.string().min(1, "Place ID is required"),
  reason: z.enum(["inaccurate", "sensitive", "duplicate", "other"]),
  details: z.string().min(10, "Please provide more details").max(500, "Details too long"),
})

export const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required").optional(),
})
