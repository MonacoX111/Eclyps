"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logMutationError } from "@/lib/admin/errors"
import { findParticipantIdByDisplayName } from "@/lib/admin/participants"
import { resolveMatchWinner, type WinnerSelection } from "@/lib/matches/core"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseMatchFormData, parseRequiredIdFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"
import { createNotification } from "@/lib/notifications/create-notification"
import {
  formatMatchScheduleTime,
  parseMatchScheduleInput,
} from "@/lib/matches/schedule"

type MatchMutationData = {
  tournament_id: string
  round: string | null
  team1: string
  team2: string
  score1: number | null
  score2: number | null
  status: "upcoming" | "live" | "finished"
  match_order: number
  participant_type: "team" | "player"
  participant_1_id: string | null
  participant_2_id: string | null
  winner_participant_id: string | null
  scheduled_at: string | null
  timezone: string | null
  schedule_note: string | null
  broadcast_type: "twitch" | "youtube" | "kick" | "discord" | "other" | null
  broadcast_url: string | null
  broadcast_label: string | null
}

type MatchMutationResult =
  | { ok: true; data: MatchMutationData }
  | { ok: false; error: string }

export async function createMatch(formData: FormData) {
  await requireAdminSession()
  const parsed = parseMatchFormData(formData)
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")
  const matchData = await withMatchParticipantReferences(supabaseAdmin, parsed.data)
  if (!matchData.ok) redirect(`/admin?matchError=${matchData.error}#matches`)

  const { error } = await runSupabaseMutation("create match", () =>
    supabaseAdmin.from("matches").insert(matchData.data),
  )
  if (error) {
    logMutationError("create match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=created#matches")
}

export async function updateMatch(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parseMatchFormData(formData)
  if (!parsedId.ok) redirect("/admin?matchError=missing-id#matches")
  if (!parsed.ok) redirect(`/admin?matchError=${parsed.error}#matches`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  // Fetch the existing match to check for date/time updates
  const { data: existingMatch } = await supabaseAdmin
    .from("matches")
    .select("scheduled_at, tournament_id, participant_1_id, participant_2_id, participant_type, round")
    .eq("id", parsedId.data.id)
    .maybeSingle()

  const matchData = await withMatchParticipantReferences(supabaseAdmin, parsed.data)
  if (!matchData.ok) redirect(`/admin?matchError=${matchData.error}#matches`)

  const { error } = await runSupabaseMutation("update match", () =>
    supabaseAdmin.from("matches").update(matchData.data).eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("update match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  // Trigger match_scheduled notification if the scheduled_at value actually changes!
  if (existingMatch && existingMatch.scheduled_at !== matchData.data.scheduled_at) {
    await sendMatchScheduledNotifications(
      supabaseAdmin,
      parsedId.data.id,
      existingMatch,
      matchData.data.scheduled_at,
      matchData.data.timezone,
      matchData.data.schedule_note
    )
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=updated#matches")
}

export async function deleteMatch(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?matchError=missing-id#matches")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?matchError=admin-client-unavailable#matches")

  const { error } = await runSupabaseMutation("delete match", () =>
    supabaseAdmin.from("matches").delete().eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("delete match", error)
    redirect("/admin?matchError=mutation-failed#matches")
  }

  revalidatePath("/admin")
  redirect("/admin?matchSuccess=deleted#matches")
}

async function withMatchParticipantReferences(
  supabaseAdmin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  data: {
    tournament_id: string
    team1: string
    team2: string
    score1: number | null
    score2: number | null
    status: "upcoming" | "live" | "finished"
    participant_type: "team" | "player"
    winner_selection: WinnerSelection
    round: string | null
    match_order: number
    schedule_date: string | null
    schedule_time: string | null
    timezone: string
    schedule_note: string | null
    broadcast_type: "twitch" | "youtube" | "kick" | "discord" | "other" | null
    broadcast_url: string | null
    broadcast_label: string | null
  },
): Promise<MatchMutationResult> {
  const {
    winner_selection: winnerSelection,
    schedule_date: scheduleDate,
    schedule_time: scheduleTime,
    timezone,
    schedule_note: scheduleNote,
    ...matchData
  } = data
  const [participant1Id, participant2Id] = await Promise.all([
    findParticipantIdByDisplayName(supabaseAdmin, {
      tournamentId: matchData.tournament_id,
      participantType: matchData.participant_type,
      displayName: matchData.team1,
    }),
    findParticipantIdByDisplayName(supabaseAdmin, {
      tournamentId: matchData.tournament_id,
      participantType: matchData.participant_type,
      displayName: matchData.team2,
    }),
  ])

  const winnerResult = resolveMatchWinner({
    status: matchData.status,
    score1: matchData.score1,
    score2: matchData.score2,
    participant1Id,
    participant2Id,
    winnerSelection,
  })

  if (!winnerResult.ok) {
    return winnerResult
  }

  return {
    ok: true,
    data: {
      ...matchData,
      participant_1_id: participant1Id,
      participant_2_id: participant2Id,
      winner_participant_id: winnerResult.winnerParticipantId,
      scheduled_at: parseMatchScheduleInput({
        scheduleDate,
        scheduleTime,
        timezone,
      }),
      timezone: scheduleDate && scheduleTime ? timezone : null,
      schedule_note: scheduleNote,
    },
  }
}

async function sendMatchScheduledNotifications(
  supabaseAdmin: any,
  matchId: string,
  existingMatch: {
    tournament_id: string
    participant_1_id: string | null
    participant_2_id: string | null
    round: string | null
  },
  newScheduledAt: string | null,
  newTimezone: string | null,
  newScheduleNote: string | null
) {
  try {
    const participantIds = [existingMatch.participant_1_id, existingMatch.participant_2_id].filter(Boolean) as string[]
    if (participantIds.length === 0) return

    const { data: participants } = await supabaseAdmin
      .from("participants")
      .select("id, participant_type, source_player_id, source_team_id")
      .in("id", participantIds)

    if (participants && participants.length > 0) {
      const playerSourceIds = participants.filter((p: any) => p.participant_type === "player" && p.source_player_id).map((p: any) => p.source_player_id) as string[]
      const teamSourceIds = participants.filter((p: any) => p.participant_type === "team" && p.source_team_id).map((p: any) => p.source_team_id) as string[]

      const [playersRes, teamsRes, tournamentRes] = await Promise.all([
        playerSourceIds.length > 0
          ? supabaseAdmin.from("players").select("id, owner_user_id").in("id", playerSourceIds)
          : { data: [] },
        teamSourceIds.length > 0
          ? supabaseAdmin.from("teams").select("id, owner_user_id").in("id", teamSourceIds)
          : { data: [] },
        supabaseAdmin.from("tournaments").select("name").eq("id", existingMatch.tournament_id).maybeSingle()
      ])

      const playerOwnerMap = new Map<string, string | null>(
        (playersRes.data ?? []).map((p: any) => [p.id, p.owner_user_id])
      )
      const teamOwnerMap = new Map<string, string | null>(
        (teamsRes.data ?? []).map((t: any) => [t.id, t.owner_user_id])
      )
      const tName = tournamentRes.data?.name || "Tournament"

      const formattedTime = formatMatchScheduleTime({
        scheduledAt: newScheduledAt,
        timezone: newTimezone,
        scheduleNote: newScheduleNote
      })

      const notificationPromises = []

      for (const participant of participants) {
        let ownerId: string | null = null
        let pId: string | null = null
        let tId: string | null = null

        if (participant.participant_type === "player" && participant.source_player_id) {
          ownerId = playerOwnerMap.get(participant.source_player_id) || null
          pId = participant.source_player_id
        } else if (participant.participant_type === "team" && participant.source_team_id) {
          ownerId = teamOwnerMap.get(participant.source_team_id) || null
          tId = participant.source_team_id
        }

        if (ownerId) {
          notificationPromises.push(
            createNotification({
              userProfileId: ownerId,
              playerId: pId,
              teamId: tId,
              tournamentId: existingMatch.tournament_id,
              matchId,
              type: "match_scheduled",
              title: "Match Scheduled",
              message: `Your match in round ${existingMatch.round || ""} of "${tName}" has been scheduled/updated: ${formattedTime}.`,
            })
          )
        }
      }

      if (notificationPromises.length > 0) {
        await Promise.allSettled(notificationPromises)
      }
    }
  } catch (err) {
    console.error("Failed to generate match scheduled notifications:", err)
  }
}
