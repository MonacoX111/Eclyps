import "server-only"

import { getPlatformUserState, type ApprovedPlayerProfile } from "@/lib/auth/player-state"
import type { UserProfile } from "@/lib/auth/user-profile"

export type PlayerPageAccess =
  | {
      allowed: true
      userProfile: UserProfile
      approvedPlayer: ApprovedPlayerProfile
    }
  | {
      allowed: false
      userProfile: UserProfile | null
      reason: "login_required" | "approval_pending" | "approval_rejected"
    }

export async function getPlayerPageAccess(
  userProfile: UserProfile | null,
): Promise<PlayerPageAccess> {
  if (!userProfile) {
    return {
      allowed: false,
      userProfile: null,
      reason: "login_required",
    }
  }

  const platformState = await getPlatformUserState({
    userProfile,
    tournamentId: null,
  })

  if (platformState.approvedPlayer) {
    return {
      allowed: true,
      userProfile,
      approvedPlayer: platformState.approvedPlayer,
    }
  }

  return {
    allowed: false,
    userProfile,
    reason:
      platformState.playerApplication?.status === "rejected"
        ? "approval_rejected"
        : "approval_pending",
  }
}
