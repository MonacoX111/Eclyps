import type { FieldHint } from "@/components/admin/admin-form-fields"

type HintGroup = Record<string, FieldHint>

export type AdminFieldHints = {
  common: HintGroup
  players: HintGroup
  teams: HintGroup
  results: HintGroup
  news: HintGroup
  matches: HintGroup
  participants: HintGroup
}

/**
 * Bilingual help tooltips for every admin form field.
 * Keyed by panel, then by field key (translation key minus the "Field" suffix).
 */
export function getAdminFieldHints(isUk: boolean): AdminFieldHints {
  const uk: AdminFieldHints = {
    common: {
      tournament: { title: "Турнір, до якого належить цей запис.", example: "Eclyps Winter Cup 2026" },
    },
    players: {
      realName: { title: "Справжнє імʼя гравця (не публічне, для адміністрування).", example: "Олександр Коваленко" },
      nickname: { title: "Нікнейм / ігрове імʼя, яке бачать усі на сайті.", example: "s1mple" },
      region: { title: "Регіон або країна гравця.", example: "Ukraine, EU" },
      seed: { title: "Посів — сила гравця для авто-сітки (1 = найсильніший).", example: "1, 2, 3" },
      wins: { title: "Загальна кількість перемог гравця.", example: "12" },
      losses: { title: "Загальна кількість поразок гравця.", example: "4" },
    },
    teams: {
      name: { title: "Назва команди, яку бачать усі.", example: "Eclyps Esports" },
      seed: { title: "Посів — сила команди для авто-сітки (1 = найсильніша).", example: "1, 2, 3" },
      wins: { title: "Загальна кількість перемог команди.", example: "18" },
      losses: { title: "Загальна кількість поразок команди.", example: "6" },
    },
    results: {
      placement: { title: "Підсумкове місце учасника в турнірі.", example: "1 (чемпіон), 2, 3" },
      label: { title: "Текстова мітка результату (необовʼязково).", example: "Champion, Finalist" },
      mvp: { title: "Найкращий гравець (MVP) турніру/матчу.", example: "s1mple" },
      scoreline: { title: "Підсумковий рахунок серії.", example: "2:1, 16:12" },
      note: { title: "Короткий коментар до результату (необовʼязково).", example: "Перемога на тай-брейку" },
    },
    news: {
      title: { title: "Заголовок новини, який бачать читачі.", example: "Стартує зимовий сезон Eclyps" },
      slug: { title: "Частина URL латиницею, малі літери й дефіси.", example: "winter-season-start" },
      category: { title: "Категорія новини для фільтрації.", example: "announcement, update, patch_notes" },
      author: { title: "Імʼя автора публікації.", example: "Eclyps Team" },
      status: { title: "Статус: чернетка, опубліковано чи в архіві.", example: "Опубліковано" },
      publishedAt: { title: "Дата й час публікації новини.", example: "14.02.2026 18:00" },
      coverImage: { title: "Посилання на обкладинку новини (URL зображення).", example: "https://.../cover.jpg" },
      excerpt: { title: "Короткий анонс (1–2 речення) для прев'ю.", example: "Реєстрація вже відкрита!" },
    },
    matches: {
      bracketSize: { title: "Розмір турнірної сітки (кількість слотів).", example: "2, 4, 8, 16" },
      round: { title: "Назва раунду/етапу матчу.", example: "Final, Semifinal, Group A" },
      score1: { title: "Рахунок першого учасника.", example: "16" },
      score2: { title: "Рахунок другого учасника.", example: "12" },
      status: { title: "Статус матчу.", example: "Майбутній, Наживо, Завершено" },
      winner: { title: "Переможець матчу. «Авто» визначить за рахунком.", example: "Авто / немає" },
      scheduleDate: { title: "Дата проведення матчу.", example: "14.02.2026" },
      scheduleTime: { title: "Час початку матчу (за обраним поясом).", example: "18:00" },
      timezone: { title: "Часовий пояс часу матчу.", example: "Europe/Kyiv" },
      scheduleNote: { title: "Примітка до розкладу (необовʼязково).", example: "Час може змінитися" },
      channelType: { title: "Тип каналу трансляції/звʼязку.", example: "Twitch, YouTube, Discord" },
      channelUrl: { title: "Посилання на канал трансляції чи звʼязку.", example: "https://twitch.tv/eclyps" },
      channelLabel: { title: "Підпис кнопки каналу.", example: "Дивитися трансляцію" },
      matchOrder: { title: "Порядок матчу в списку (менше = вище).", example: "1, 2, 3" },
    },
    participants: {
      tournament: { title: "Турнір, до якого додається учасник.", example: "Eclyps Winter Cup 2026" },
      participantType: { title: "Хто додається: окремий гравець чи команда.", example: "Гравець / Команда" },
      global: { title: "Оберіть наявний глобальний профіль гравця або команди.", example: "s1mple / Eclyps Esports" },
      seed: { title: "Посів учасника для авто-сітки (1 = найсильніший).", example: "1, 2, 3" },
    },
  }

  const en: AdminFieldHints = {
    common: {
      tournament: { title: "Tournament this record belongs to.", example: "Eclyps Winter Cup 2026" },
    },
    players: {
      realName: { title: "Player's real name (private, for admin use).", example: "Alex Kovalenko" },
      nickname: { title: "Nickname / in-game name shown publicly.", example: "s1mple" },
      region: { title: "Player's region or country.", example: "Ukraine, EU" },
      seed: { title: "Seed — player strength for auto-bracket (1 = strongest).", example: "1, 2, 3" },
      wins: { title: "Total number of player wins.", example: "12" },
      losses: { title: "Total number of player losses.", example: "4" },
    },
    teams: {
      name: { title: "Team name shown publicly.", example: "Eclyps Esports" },
      seed: { title: "Seed — team strength for auto-bracket (1 = strongest).", example: "1, 2, 3" },
      wins: { title: "Total number of team wins.", example: "18" },
      losses: { title: "Total number of team losses.", example: "6" },
    },
    results: {
      placement: { title: "Final placement of the participant.", example: "1 (champion), 2, 3" },
      label: { title: "Text label for the result (optional).", example: "Champion, Finalist" },
      mvp: { title: "Most valuable player (MVP).", example: "s1mple" },
      scoreline: { title: "Final series score.", example: "2:1, 16:12" },
      note: { title: "Short comment about the result (optional).", example: "Won on tie-break" },
    },
    news: {
      title: { title: "News headline readers see.", example: "Eclyps Winter Season begins" },
      slug: { title: "URL part, lowercase latin with dashes.", example: "winter-season-start" },
      category: { title: "News category for filtering.", example: "announcement, update, patch_notes" },
      author: { title: "Author name of the post.", example: "Eclyps Team" },
      status: { title: "Status: draft, published or archived.", example: "Published" },
      publishedAt: { title: "Publish date and time.", example: "2026-02-14 18:00" },
      coverImage: { title: "Cover image link (image URL).", example: "https://.../cover.jpg" },
      excerpt: { title: "Short teaser (1–2 sentences) for previews.", example: "Registration is now open!" },
    },
    matches: {
      bracketSize: { title: "Bracket size (number of slots).", example: "2, 4, 8, 16" },
      round: { title: "Round / stage name of the match.", example: "Final, Semifinal, Group A" },
      score1: { title: "Score of the first participant.", example: "16" },
      score2: { title: "Score of the second participant.", example: "12" },
      status: { title: "Match status.", example: "Upcoming, Live, Finished" },
      winner: { title: "Match winner. 'Auto' decides by score.", example: "Auto / none" },
      scheduleDate: { title: "Match date.", example: "2026-02-14" },
      scheduleTime: { title: "Match start time (in chosen timezone).", example: "18:00" },
      timezone: { title: "Timezone of the match time.", example: "Europe/Kyiv" },
      scheduleNote: { title: "Schedule note (optional).", example: "Time may change" },
      channelType: { title: "Type of broadcast/communication channel.", example: "Twitch, YouTube, Discord" },
      channelUrl: { title: "Link to the broadcast or channel.", example: "https://twitch.tv/eclyps" },
      channelLabel: { title: "Channel button caption.", example: "Watch stream" },
      matchOrder: { title: "Order of the match in the list (lower = higher).", example: "1, 2, 3" },
    },
    participants: {
      tournament: { title: "Tournament the participant is added to.", example: "Eclyps Winter Cup 2026" },
      participantType: { title: "Who is added: an individual player or a team.", example: "Player / Team" },
      global: { title: "Pick an existing global player or team profile.", example: "s1mple / Eclyps Esports" },
      seed: { title: "Participant seed for auto-bracket (1 = strongest).", example: "1, 2, 3" },
    },
  }

  return isUk ? uk : en
}