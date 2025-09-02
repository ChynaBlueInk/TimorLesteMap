// app/near-me/page.tsx
// Server Component wrapper (no "use client" here!)

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import NearMeClient from "./NearMeClient";

export default function Page() {
  return <NearMeClient />;
}
