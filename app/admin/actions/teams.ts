"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import {
  deleteTeamParticipant,
  upsertTeamParticipant,
} from "@/lib/admin/participants"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseRequiredIdFormData, parseTeamFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"
import { createNotification } from "@/lib/notifications/create-notification"

export async function createTeam(formData: FormData) {
  await requireAdminSession()

  const parsed = parseTeamFormData(formData)

  if (!parsed.ok) {
    redirect(`/admin?teamError=${parsed.error}#teams`)
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { data: createdTeam, error } = await runSupabaseMutation("create team", () =>
    supabaseAdmin.from("teams").insert(parsed.data).select("id").maybeSingle(),
  )

  if (error) {
    logMutationError("create team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  if (typeof createdTeam?.id === "string") {
    await upsertTeamParticipant(supabaseAdmin, {
      id: createdTeam.id,
      ...parsed.data,
    })
  }

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=created#teams")
}

export async function updateTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parseTeamFormData(formData)

  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  if (!parsed.ok) {
    redirect(`/admin?teamError=${parsed.error}#teams`)
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { error } = await runSupabaseMutation("update team", () =>
    supabaseAdmin.from("teams").update(parsed.data).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("update team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  await upsertTeamParticipant(supabaseAdmin, {
    id: parsedId.data.id,
    ...parsed.data,
  })

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=updated#teams")
}

export async function deleteTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")

  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  await deleteTeamParticipant(supabaseAdmin, parsedId.data.id)

  const { error } = await runSupabaseMutation("delete team", () =>
    supabaseAdmin.from("teams").delete().eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("delete team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  redirect("/admin?teamSuccess=deleted#teams")
}

export async function approveTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("owner_user_id, captain_user_id, name, seed, tournament_id")
    .eq("id", parsedId.data.id)
    .maybeSingle()

  const updatePayload: Record<string, any> = { status: "approved" }

  if (team && (team.seed === null || team.seed === undefined)) {
    let query = supabaseAdmin
      .from("teams")
      .select("seed")
      .eq("status", "approved")
      .not("seed", "is", null)
      .order("seed", { ascending: false })
      .limit(1)

    if (team.tournament_id) {
      query = query.eq("tournament_id", team.tournament_id)
    } else {
      query = query.is("tournament_id", null)
    }

    const { data: maxSeedRow } = await query.maybeSingle()
    const nextSeed = maxSeedRow && typeof maxSeedRow.seed === "number" ? maxSeedRow.seed + 1 : 0
    updatePayload.seed = nextSeed
  }

  const { error } = await runSupabaseMutation("approve team", () =>
    supabaseAdmin.from("teams").update(updatePayload).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("approve team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  // Sync seed to participants table if updated
  if (updatePayload.seed !== undefined) {
    try {
      const { data: participant } = await supabaseAdmin
        .from("participants")
        .select("id")
        .eq("source_team_id", parsedId.data.id)
        .maybeSingle()

      if (participant) {
        await supabaseAdmin
          .from("participants")
          .update({ seed: updatePayload.seed })
          .eq("id", participant.id)
      }
    } catch (err) {
      console.error("Failed to sync team seed to participant:", err)
    }
  }

  if (team) {
    const recipientIds = await resolveTeamRecipients(supabaseAdmin, parsedId.data.id, team)
    for (const userId of recipientIds) {
      try {
        await createNotification({
          userProfileId: userId,
          teamId: parsedId.data.id,
          type: "team_approved",
          title: "Team Approved",
          message: `Your team "${team.name}" has been approved.`,
        })
      } catch (err) {
        console.error("Failed to create team approval notification:", err)
      }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/teams")
  redirect("/admin?teamSuccess=approved#teams")
}

export async function rejectTeam(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("owner_user_id, captain_user_id, name")
    .eq("id", parsedId.data.id)
    .maybeSingle()

  const { error } = await runSupabaseMutation("reject team", () =>
    supabaseAdmin.from("teams").update({ status: "rejected" }).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("reject team", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  if (team) {
    const recipientIds = await resolveTeamRecipients(supabaseAdmin, parsedId.data.id, team)
    for (const userId of recipientIds) {
      try {
        await createNotification({
          userProfileId: userId,
          teamId: parsedId.data.id,
          type: "team_rejected",
          title: "Team Rejected",
          message: `Your team "${team.name}" has been rejected.`,
        })
      } catch (err) {
        console.error("Failed to create team rejection notification:", err)
      }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/teams")
  redirect("/admin?teamSuccess=rejected#teams")
}

export async function restoreTeamToPending(formData: FormData) {
  await requireAdminSession()

  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) {
    redirect("/admin?teamError=missing-id#teams")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    redirect("/admin?teamError=admin-client-unavailable#teams")
  }

  const { error } = await runSupabaseMutation("restore team to pending", () =>
    supabaseAdmin.from("teams").update({ status: "pending" }).eq("id", parsedId.data.id),
  )

  if (error) {
    logMutationError("restore team to pending", error)
    redirect("/admin?teamError=mutation-failed#teams")
  }

  revalidatePath("/admin")
  revalidatePath("/teams")
  redirect("/admin?teamSuccess=pending#teams")
}

async function resolveTeamRecipients(
  supabaseAdmin: any,
  teamId: string,
  team: { owner_user_id: string | null; captain_user_id: string | null }
): Promise<string[]> {
  const recipientIds = new Set<string>()

  if (team.captain_user_id) recipientIds.add(team.captain_user_id)
  if (team.owner_user_id) recipientIds.add(team.owner_user_id)

  try {
    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("player_id")
      .eq("team_id", teamId)

    if (members && members.length > 0) {
      const playerIds = members.map((m: any) => m.player_id).filter(Boolean)
      if (playerIds.length > 0) {
        const { data: players } = await supabaseAdmin
          .from("players")
          .select("owner_user_id")
          .in("id", playerIds)

        if (players && players.length > 0) {
          for (const player of players) {
            if (player.owner_user_id) {
              recipientIds.add(player.owner_user_id)
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("resolveTeamRecipients: Error querying team members:", err)
  }

  try {
    const { data: registrations } = await supabaseAdmin
      .from("tournament_registrations")
      .select("user_profile_id")
      .or(`team_id.eq.${teamId},source_team_id.eq.${teamId}`)

    if (registrations && registrations.length > 0) {
      for (const reg of registrations) {
        if (reg.user_profile_id) {
          recipientIds.add(reg.user_profile_id)
        }
      }
    }
  } catch (err) {
    console.error("resolveTeamRecipients: Error querying registrations:", err)
  }

  return Array.from(recipientIds)
}

