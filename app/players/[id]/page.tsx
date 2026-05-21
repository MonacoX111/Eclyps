import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicPlayerProfile } from "@/lib/data/profiles"

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
    return <PublicProfileError message="This player profile is not available." />
  }

  return <PublicProfilePage data={data} />
}
