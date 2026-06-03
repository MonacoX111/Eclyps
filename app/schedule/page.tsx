import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<{
    disputeError?: string
    disputeSuccess?: string
  }>
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const params = await searchParams
  const nextParams = new URLSearchParams({ tab: "upcoming" })

  if (params?.disputeError) {
    nextParams.set("disputeError", params.disputeError)
  }

  if (params?.disputeSuccess) {
    nextParams.set("disputeSuccess", params.disputeSuccess)
  }

  redirect(`/matches?${nextParams.toString()}#matches`)
}
