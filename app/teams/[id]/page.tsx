import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicTeamProfile } from "@/lib/data/profiles"
import { getLanguage } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

type TeamProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function TeamProfilePage({ params }: TeamProfilePageProps) {
  const { id } = await params
  const data = await getPublicTeamProfile(id)

  if (!data) {
    const lang = await getLanguage()
    const message = lang === "uk" ? "Цей профіль команди недоступний." : "This team profile is not available."
    return <PublicProfileError message={message} />
  }

  return <PublicProfilePage data={data} />
}
