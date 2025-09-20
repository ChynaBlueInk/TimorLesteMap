// app/trips/page.tsx
import { redirect } from "next/navigation";

export default function TripsIndex() {
  redirect("/trips/saved");
}
