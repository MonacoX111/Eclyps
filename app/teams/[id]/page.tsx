import {
  PublicProfileError,
  PublicProfilePage,
} from "@/components/public-profile-page"
import { getPublicTeamProfile } from "@/lib/data/profiles"

export const dynamic = "force-dynamic"

type TeamProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function TeamProfilePage({ params }: TeamProfilePageProps) {
  const { id } = await params
  const data = await getPublicTeamProfile(id)

  if (!data) {
    return <PublicProfileError message="This team profile is not available." />
  }

  return <PublicProfilePage data={data} />
}
