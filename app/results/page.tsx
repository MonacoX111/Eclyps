import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function ResultsPage() {
  redirect("/matches?tab=finished#matches")
}
