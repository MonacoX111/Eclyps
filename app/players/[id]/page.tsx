import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicPlayerProfile } from "@/lib/data/profiles"
import { getLanguage } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

type PlayerProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function PlayerProfilePage({
  params,
}: PlayerProfilePageProps) {
  const { id } = await params
  const data = await getPublicPlayerProfile(id)

  if (!data) {
    const lang = await getLanguage()
    const message = lang === "uk" ? "Цей профіль гравця недоступний." : "This player profile is not available."
    return <PublicProfileError message={message} />
  }

  return <PublicProfilePage data={data} />
}
