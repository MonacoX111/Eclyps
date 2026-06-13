"use client"

import Link from "next/link"
import { Archive, CalendarClock, Newspaper, Radio, Shield, Swords, Trophy, Users, type LucideIcon } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type EmptyStateVariant =
  | "matches-all"
  | "matches-upcoming"
  | "matches-live"
  | "matches-finished"
  | "teams"
  | "players"
  | "tournaments"
  | "news"

type ListEmptyStateProps = {
  variant: EmptyStateVariant
  className?: string
}

const primaryLinkClassName =
  "inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-black transition hover:bg-primary/90"

const secondaryLinkClassName =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-primary/40 hover:text-primary"

export function ListEmptyState({ variant, className = "" }: ListEmptyStateProps) {
  const { lang } = useLanguage()
  const copy = getEmptyStateCopy(lang, variant)
  const Icon = getEmptyStateIcon(variant)

  return (
    <div className={`glass-card mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl px-6 py-10 text-center ${className}`}>
      <div className="pointer-events-none mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_42px_oklch(0.78_0.18_165_/_0.14)]">
        <Icon className="h-8 w-8 text-primary" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
        {copy.eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-black text-foreground">
        {copy.title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/62">
        {copy.body}
      </p>

      {(copy.primaryHref || copy.secondaryHref) ? (
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {copy.primaryHref ? (
            <Link href={copy.primaryHref} className={primaryLinkClassName}>
              {copy.primaryLabel}
            </Link>
          ) : null}
          {copy.secondaryHref ? (
            <Link href={copy.secondaryHref} className={secondaryLinkClassName}>
              {copy.secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function getEmptyStateIcon(variant: EmptyStateVariant): LucideIcon {
  switch (variant) {
    case "matches-live":
      return Radio
    case "matches-upcoming":
      return CalendarClock
    case "matches-finished":
      return Trophy
    case "teams":
      return Shield
    case "players":
      return Users
    case "tournaments":
      return Archive
    case "news":
      return Newspaper
    default:
      return Swords
  }
}

function getEmptyStateCopy(lang: "uk" | "en", variant: EmptyStateVariant) {
  const isUk = lang === "uk"

  const shared = {
    homeHref: "/",
    homeLabel: isUk ? "На головну" : "Go home",
    tournamentHref: "/tournament",
    tournamentLabel: isUk ? "Активний турнір" : "Active tournament",
  }

  switch (variant) {
    case "matches-upcoming":
      return {
        eyebrow: isUk ? "Розклад оновлюється" : "Schedule updating",
        title: isUk ? "Найближчих матчів поки немає" : "No upcoming matches yet",
        body: isUk
          ? "Коли адміністратор додасть або згенерує наступні матчі, вони зʼявляться тут автоматично."
          : "When an admin adds or generates the next matches, they will appear here automatically.",
        primaryHref: "/matches?tab=all",
        primaryLabel: isUk ? "Усі матчі" : "All matches",
        secondaryHref: shared.tournamentHref,
        secondaryLabel: shared.tournamentLabel,
      }
    case "matches-live":
      return {
        eyebrow: isUk ? "Live-пауза" : "Live pause",
        title: isUk ? "Зараз немає live-матчів" : "No live matches right now",
        body: isUk
          ? "Перевір upcoming-розклад або повернись сюди під час активної ігрової сесії."
          : "Check the upcoming schedule or come back during an active play session.",
        primaryHref: "/matches?tab=upcoming",
        primaryLabel: isUk ? "Upcoming" : "Upcoming",
        secondaryHref: "/matches?tab=all",
        secondaryLabel: isUk ? "Усі матчі" : "All matches",
      }
    case "matches-finished":
      return {
        eyebrow: isUk ? "Результати ще попереду" : "Results pending",
        title: isUk ? "Завершених матчів поки немає" : "No finished matches yet",
        body: isUk
          ? "Після публікації результатів матчі з рахунками та переможцями будуть доступні в цьому розділі."
          : "After results are published, matches with scores and winners will be available here.",
        primaryHref: "/matches?tab=upcoming",
        primaryLabel: isUk ? "Upcoming" : "Upcoming",
        secondaryHref: shared.tournamentHref,
        secondaryLabel: shared.tournamentLabel,
      }
    case "teams":
      return {
        eyebrow: isUk ? "Команди очікуються" : "Teams pending",
        title: isUk ? "Зареєстрованих команд поки немає" : "No registered teams yet",
        body: isUk
          ? "Коли команди отримають approved-статус, вони зʼявляться в цьому списку з профілями, складом і статистикою."
          : "Approved teams will appear here with profiles, rosters, and stats once they are ready.",
        primaryHref: "/teams",
        primaryLabel: isUk ? "Створити команду" : "Create a team",
        secondaryHref: "/registration",
        secondaryLabel: isUk ? "Реєстрація" : "Registration",
      }
    case "players":
      return {
        eyebrow: isUk ? "Гравці очікуються" : "Players pending",
        title: isUk ? "Зареєстрованих гравців поки немає" : "No registered players yet",
        body: isUk
          ? "Після підтвердження профілів гравці зʼявляться тут із публічними картками та статистикою."
          : "Approved players will appear here with public cards and stats after their profiles are confirmed.",
        primaryHref: "/registration",
        primaryLabel: isUk ? "Стати гравцем" : "Become a player",
        secondaryHref: shared.tournamentHref,
        secondaryLabel: shared.tournamentLabel,
      }
    case "tournaments":
      return {
        eyebrow: isUk ? "Архів чистий" : "Archive empty",
        title: isUk ? "Турнірів за цими фільтрами немає" : "No tournaments match these filters",
        body: isUk
          ? "Спробуй очистити пошук/фільтри або повернись до активного турніру. Завершені турніри зʼявляться тут автоматично."
          : "Try clearing search/filters or return to the active tournament. Finished tournaments will appear here automatically.",
        primaryHref: "/tournaments",
        primaryLabel: isUk ? "Очистити фільтри" : "Clear filters",
        secondaryHref: shared.tournamentHref,
        secondaryLabel: shared.tournamentLabel,
      }
    case "news":
      return {
        eyebrow: isUk ? "Новини готуються" : "News preparing",
        title: isUk ? "Публікацій поки немає" : "No posts yet",
        body: isUk
          ? "Анонси, результати, оновлення правил і patch notes зʼявляться тут після публікації."
          : "Announcements, results, rules updates, and patch notes will appear here after publication.",
        primaryHref: shared.tournamentHref,
        primaryLabel: shared.tournamentLabel,
        secondaryHref: shared.homeHref,
        secondaryLabel: shared.homeLabel,
      }
    default:
      return {
        eyebrow: isUk ? "Матчі очікуються" : "Matches pending",
        title: isUk ? "Матчів поки немає" : "No matches yet",
        body: isUk
          ? "Коли турнірний bracket або розклад буде сформовано, усі матчі зʼявляться на цій сторінці."
          : "Once the tournament bracket or schedule is generated, all matches will appear on this page.",
        primaryHref: shared.tournamentHref,
        primaryLabel: shared.tournamentLabel,
        secondaryHref: "/registration",
        secondaryLabel: isUk ? "Реєстрація" : "Registration",
      }
  }
}
