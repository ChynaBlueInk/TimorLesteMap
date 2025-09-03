// app/submit/page.tsx
export const dynamic = "force-dynamic";
// REMOVE this line: export const revalidate = 0;
export const fetchCache = "force-no-store";

import SubmitClient from "./SubmitClient";

export default function Page() {
  return <SubmitClient />;
}
