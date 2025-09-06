// app/places/[id]/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import PlaceDetailClient from "./Client";

export default function Page({ params }: { params: { id: string } }) {
  return <PlaceDetailClient id={params.id} />;
}
