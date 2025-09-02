// app/map/page.tsx
// NOTE: This file is a **Server Component**. Do not add "use client" here.

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import MapClient from "./MapClient";

export default function Page() {
  return <MapClient />;
}
