import type { AdminFeedback, AdminSearchParams } from "@/lib/admin/types"

type AdminFeedbackLanguage = "uk" | "en"

function feedback(
  tone: AdminFeedback["tone"],
  message: string,
  lang: AdminFeedbackLanguage,
): AdminFeedback {
  return {
    tone,
    message: lang === "uk" ? ADMIN_FEEDBACK_UK[message] ?? message : message,
  }
}

const ADMIN_FEEDBACK_UK: Record<string, string> = {
  "Tournament created.": "Турнір створено.",
  "Tournament updated.": "Турнір оновлено.",
  "Tournament deleted.": "Турнір видалено.",
  "Name must not be empty.": "Назва не може бути порожньою.",
  "Game must not be empty.": "Гра не може бути порожньою.",
  "Participant type must be player or team.": "Тип учасника має бути гравець або команда.",
  "Team count must be a number greater than 0.": "Кількість команд має бути числом більше 0.",
  "Match days must be a number greater than 0.": "Кількість днів матчів має бути числом більше 0.",
  "Status must be upcoming, live, or finished.": "Статус має бути майбутній, live або завершено.",
  "Tournament id is missing.": "ID турніру відсутній.",
  "Tournament mutations require a server-only Supabase admin client.": "Зміни турніру потребують серверного Supabase admin client.",
  "Tournament change could not be saved. Please try again.": "Зміни турніру не вдалося зберегти. Спробуйте ще раз.",
  "Tournament could not be deleted because dependent cleanup failed.": "Турнір не вдалося видалити, бо очищення залежних даних завершилося помилкою.",
  "Tournament change could not be saved.": "Зміни турніру не вдалося зберегти.",
  "Active tournament updated.": "Активний турнір оновлено.",
  "Tournament could not be found.": "Турнір не знайдено.",
  "Active tournament changes require a server-only Supabase admin client.": "Зміна активного турніру потребує серверного Supabase admin client.",
  "Active tournament could not be updated. Please try again.": "Активний турнір не вдалося оновити. Спробуйте ще раз.",
  "Active tournament could not be updated.": "Активний турнір не вдалося оновити.",
  "Team created.": "Команду створено.",
  "Team updated.": "Команду оновлено.",
  "Team deleted.": "Команду видалено.",
  "Tournament is required.": "Оберіть турнір.",
  "Team name must not be empty.": "Назва команди не може бути порожньою.",
  "Seed must be a positive integer.": "Посів має бути додатним цілим числом.",
  "Wins must be an integer greater than or equal to 0.": "Перемоги мають бути цілим числом 0 або більше.",
  "Losses must be an integer greater than or equal to 0.": "Поразки мають бути цілим числом 0 або більше.",
  "Team id is missing.": "ID команди відсутній.",
  "Team mutations require a server-only Supabase admin client.": "Зміни команди потребують серверного Supabase admin client.",
  "Team change could not be saved. Please try again.": "Зміни команди не вдалося зберегти. Спробуйте ще раз.",
  "Team change could not be saved.": "Зміни команди не вдалося зберегти.",
  "Player created.": "Гравця створено.",
  "Player updated.": "Гравця оновлено.",
  "Player deleted.": "Гравця видалено.",
  "Player profile approved.": "Профіль гравця схвалено.",
  "Player profile rejected.": "Профіль гравця відхилено.",
  "Player profile restored to pending.": "Профіль гравця повернено на розгляд.",
  "Player name must not be empty.": "Ім'я гравця не може бути порожнім.",
  "Seed must be a positive integer when provided.": "Посів має бути додатним цілим числом, якщо його вказано.",
  "Player id is missing.": "ID гравця відсутній.",
  "Player mutations require a server-only Supabase admin client.": "Зміни гравця потребують серверного Supabase admin client.",
  "Player change could not be saved. Please try again.": "Зміни гравця не вдалося зберегти. Спробуйте ще раз.",
  "Player change could not be saved.": "Зміни гравця не вдалося зберегти.",
  "Match created.": "Матч створено.",
  "Match updated.": "Матч оновлено.",
  "Match deleted.": "Матч видалено.",
  "Bracket template generated.": "Шаблон сітки згенеровано.",
  "Bracket slot updated.": "Слот сітки оновлено.",
  "Bracket locked.": "Сітку заблоковано.",
  "Bracket unlocked.": "Сітку розблоковано.",
  "Bracket match updated.": "Матч сітки оновлено.",
  "Team 1 must not be empty.": "Команда 1 не може бути порожньою.",
  "Team 2 must not be empty.": "Команда 2 не може бути порожньою.",
  "Team 1 and Team 2 must be different.": "Команда 1 і Команда 2 мають відрізнятися.",
  "Scores must be whole numbers or left empty.": "Рахунки мають бути цілими числами або порожніми.",
  "Match order must be a positive integer.": "Порядок матчу має бути додатним цілим числом.",
  "Participant type must be team or player.": "Тип учасника має бути команда або гравець.",
  "Winner must be one of the match participants.": "Переможець має бути одним з учасників матчу.",
  "Finished matches require both scores.": "Для завершених матчів потрібні обидва рахунки.",
  "Finished matches require matched participant records.": "Для завершених матчів потрібні прив'язані записи учасників.",
  "Tied finished matches require a selected winner.": "Для нічиєї в завершеному матчі потрібно обрати переможця.",
  "Winner must match the higher score.": "Переможець має відповідати більшому рахунку.",
  "Schedule date and time must both be valid or both be empty.": "Дата й час розкладу мають бути валідними або обидва порожніми.",
  "Timezone must be a valid IANA timezone.": "Часовий пояс має бути валідним IANA timezone.",
  "Channel type is invalid.": "Тип каналу некоректний.",
  "Invalid channel URL": "Некоректне посилання на канал",
  "Bracket size must be 2, 4, 8, or 16 participants.": "Розмір сітки має бути 2, 4, 8 або 16 учасників.",
  "Bracket id is missing.": "ID сітки відсутній.",
  "Bracket status action is invalid.": "Дія статусу сітки невалідна.",
  "This tournament already has a bracket. Confirm regeneration to replace the bracket template.": "Цей турнір уже має сітку. Підтвердіть регенерацію, щоб замінити шаблон сітки.",
  "Bracket template links could not be generated safely.": "Посилання шаблону сітки не вдалося безпечно згенерувати.",
  "Bracket slot must be 1 or 2.": "Слот сітки має бути 1 або 2.",
  "Participant must belong to this tournament and match type.": "Учасник має належати цьому турніру та типу матчу.",
  "Bracket match could not be found for this tournament.": "Матч сітки для цього турніру не знайдено.",
  "Only generated bracket matches can use slot assignment.": "Призначення слотів доступне лише для згенерованих матчів сітки.",
  "Finished matches cannot have bracket slots changed.": "У завершених матчах не можна змінювати слоти сітки.",
  "This bracket is locked and cannot be edited.": "Цю сітку заблоковано, її не можна редагувати.",
  "This bracket has live or finished matches and cannot be structurally edited.": "У цій сітці є live або завершені матчі, тому структуру не можна редагувати.",
  "Brackets cannot be unlocked after matches are live or finished.": "Сітку не можна розблокувати після live або завершених матчів.",
  "Lock the bracket before editing bracket match status or scores.": "Заблокуйте сітку перед редагуванням статусу або рахунків матчів сітки.",
  "Assign both bracket slots before starting or finishing the match.": "Призначте обидва слоти сітки перед стартом або завершенням матчу.",
  "A participant cannot be assigned twice in the same bracket.": "Учасника не можна призначити двічі в одній сітці.",
  "Winner could not advance because the next bracket match has already started.": "Переможця не вдалося просунути, бо наступний матч сітки вже почався.",
  "Winner could not advance because the next bracket slot already has a different participant.": "Переможця не вдалося просунути, бо наступний слот сітки вже має іншого учасника.",
  "Match id is missing.": "ID матчу відсутній.",
  "Match mutations require a server-only Supabase admin client.": "Зміни матчу потребують серверного Supabase admin client.",
  "Match change could not be saved. Please try again.": "Зміни матчу не вдалося зберегти. Спробуйте ще раз.",
  "Match change could not be saved.": "Зміни матчу не вдалося зберегти.",
  "Result created.": "Результат створено.",
  "Result updated.": "Результат оновлено.",
  "Result deleted.": "Результат видалено.",
  "Team must not be empty.": "Команда не може бути порожньою.",
  "Placement must be a positive integer.": "Місце має бути додатним цілим числом.",
  "Result id is missing.": "ID результату відсутній.",
  "Result mutations require a server-only Supabase admin client.": "Зміни результату потребують серверного Supabase admin client.",
  "Result change could not be saved. Please try again.": "Зміни результату не вдалося зберегти. Спробуйте ще раз.",
  "Result change could not be saved.": "Зміни результату не вдалося зберегти.",
  "Player application approved.": "Заявку гравця схвалено.",
  "Player application rejected.": "Заявку гравця відхилено.",
  "Recent player application decisions cleared.": "Нещодавні рішення заявок гравців очищено.",
  "Player application id is missing.": "ID заявки гравця відсутній.",
  "Player application decision must be approve or reject.": "Рішення щодо заявки гравця має бути схвалити або відхилити.",
  "This player application has already been reviewed.": "Цю заявку гравця вже розглянуто.",
  "Player application review requires a server-only Supabase admin client.": "Розгляд заявки гравця потребує серверного Supabase admin client.",
  "Player application review could not be saved. Please try again.": "Рішення щодо заявки гравця не вдалося зберегти. Спробуйте ще раз.",
  "Player application review could not be saved.": "Рішення щодо заявки гравця не вдалося зберегти.",
  "Registration approved and added to participants.": "Реєстрацію схвалено й додано до учасників.",
  "Registration rejected.": "Реєстрацію відхилено.",
  "Recent registration decisions cleared.": "Нещодавні рішення реєстрацій очищено.",
  "Registration id is missing.": "ID реєстрації відсутній.",
  "Registration decision must be approve or reject.": "Рішення щодо реєстрації має бути схвалити або відхилити.",
  "This registration has already been reviewed.": "Цю реєстрацію вже розглянуто.",
  "Tournament participant type is invalid.": "Тип учасника турніру невалідний.",
  "This registration does not match the tournament participant type.": "Ця реєстрація не відповідає типу учасника турніру.",
  "Registration tournament could not be found.": "Турнір реєстрації не знайдено.",
  "This tournament is closed.": "Цей турнір закрито.",
  "This tournament is full.": "Цей турнір заповнений.",
  "This participant is already approved for the tournament.": "Цей учасник уже схвалений для турніру.",
  "Registration review requires a server-only Supabase admin client.": "Розгляд реєстрації потребує серверного Supabase admin client.",
  "Registration review could not be saved. Please try again.": "Рішення щодо реєстрації не вдалося зберегти. Спробуйте ще раз.",
  "Registration review could not be saved.": "Рішення щодо реєстрації не вдалося зберегти.",
  "Dispute marked under review.": "Диспут позначено як на розгляді.",
  "Dispute resolved.": "Диспут вирішено.",
  "Dispute rejected.": "Диспут відхилено.",
  "Dispute reopened.": "Диспут відкрито повторно.",
  "Dispute id is missing.": "ID диспуту відсутній.",
  "Dispute status is invalid.": "Статус диспуту невалідний.",
  "Dispute review requires a server-only Supabase admin client.": "Розгляд диспуту потребує серверного Supabase admin client.",
  "Dispute review could not be saved. Please try again.": "Рішення щодо диспуту не вдалося зберегти. Спробуйте ще раз.",
  "Dispute review could not be saved.": "Рішення щодо диспуту не вдалося зберегти.",
  "Participant removed from tournament.": "Учасника видалено з турніру.",
  "Participant added successfully.": "Учасника успішно додано.",
  "Participant id is missing.": "ID учасника відсутній.",
  "Participant mutations require a server-only Supabase admin client.": "Зміни учасника потребують серверного Supabase admin client.",
  "This participant is already used in generated matches. Reset the bracket before removing them.": "Цей учасник уже використовується в згенерованих матчах. Скиньте сітку перед видаленням.",
  "This player/team is already added to this tournament.": "Цього гравця/команду вже додано до турніру.",
  "Selected player was not found.": "Обраного гравця не знайдено.",
  "Selected team was not found.": "Обрану команду не знайдено.",
  "This seed is already used in this tournament.": "Цей посів уже використовується в турнірі.",
  "Participants cannot be added after the bracket has been generated. Reset the bracket first.": "Учасників не можна додавати після генерації сітки. Спочатку скиньте сітку.",
  "Participant details are invalid.": "Дані учасника невалідні.",
  "Participant action failed. Please try again.": "Дію з учасником не вдалося виконати. Спробуйте ще раз.",
  "Participant action failed.": "Дію з учасником не вдалося виконати.",
  "News post created.": "Новину створено.",
  "News post updated.": "Новину оновлено.",
  "News post published.": "Новину опубліковано.",
  "News post archived.": "Новину архівовано.",
  "News post deleted.": "Новину видалено.",
  "Title must not be empty.": "Заголовок не може бути порожнім.",
  "Slug must use lowercase letters, numbers, and hyphens.": "Slug має містити малі літери, цифри та дефіси.",
  "Content must not be empty.": "Контент не може бути порожнім.",
  "Status must be draft, published, or archived.": "Статус має бути чернетка, опубліковано або архівовано.",
  "Published date must be valid.": "Дата публікації має бути валідною.",
  "News post id is missing.": "ID новини відсутній.",
  "Confirm deletion before deleting a published post.": "Підтвердіть видалення перед видаленням опублікованої новини.",
  "News mutations require a server-only Supabase admin client.": "Зміни новин потребують серверного Supabase admin client.",
  "News post change could not be saved. Please try again.": "Зміни новини не вдалося зберегти. Спробуйте ще раз.",
  "News post change could not be saved.": "Зміни новини не вдалося зберегти.",
}

export function getTournamentFeedback(searchParams?: Pick<AdminSearchParams, "crudError" | "crudSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.crudSuccess === "created") return feedback("success", "Tournament created.", lang)
  if (searchParams?.crudSuccess === "updated") return feedback("success", "Tournament updated.", lang)
  if (searchParams?.crudSuccess === "deleted") return feedback("success", "Tournament deleted.", lang)
  if (!searchParams?.crudError) return null

  const message =
    {
      "invalid-name": "Name must not be empty.",
      "invalid-game": "Game must not be empty.",
      "invalid-participant-type": "Participant type must be player or team.",
      "invalid-team-count": "Team count must be a number greater than 0.",
      "invalid-match-days": "Match days must be a number greater than 0.",
      "invalid-status": "Status must be upcoming, live, or finished.",
      "missing-id": "Tournament id is missing.",
      "admin-client-unavailable":
        "Tournament mutations require a server-only Supabase admin client.",
      "mutation-failed": "Tournament change could not be saved. Please try again.",
      "dependent-cleanup-failed": "Tournament could not be deleted because dependent cleanup failed.",
    }[searchParams.crudError] ?? "Tournament change could not be saved."

  return feedback("error", message, lang)
}

export function getActiveTournamentFeedback(searchParams?: Pick<AdminSearchParams, "activeError" | "activeSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.activeSuccess === "updated") return feedback("success", "Active tournament updated.", lang)
  if (!searchParams?.activeError) return null

  const message =
    {
      "missing-id": "Tournament id is missing.",
      "not-found": "Tournament could not be found.",
      "admin-client-unavailable":
        "Active tournament changes require a server-only Supabase admin client.",
      "mutation-failed": "Active tournament could not be updated. Please try again.",
    }[searchParams.activeError] ?? "Active tournament could not be updated."

  return feedback("error", message, lang)
}

export function getTeamFeedback(searchParams?: Pick<AdminSearchParams, "teamError" | "teamSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.teamSuccess === "created") return feedback("success", "Team created.", lang)
  if (searchParams?.teamSuccess === "updated") return feedback("success", "Team updated.", lang)
  if (searchParams?.teamSuccess === "deleted") return feedback("success", "Team deleted.", lang)
  if (!searchParams?.teamError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-team-name": "Team name must not be empty.",
      "invalid-seed": "Seed must be a positive integer.",
      "invalid-wins": "Wins must be an integer greater than or equal to 0.",
      "invalid-losses": "Losses must be an integer greater than or equal to 0.",
      "missing-id": "Team id is missing.",
      "admin-client-unavailable":
        "Team mutations require a server-only Supabase admin client.",
      "mutation-failed": "Team change could not be saved. Please try again.",
    }[searchParams.teamError] ?? "Team change could not be saved."

  return feedback("error", message, lang)
}

export function getPlayerFeedback(searchParams?: Pick<AdminSearchParams, "playerError" | "playerSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.playerSuccess === "created") return feedback("success", "Player created.", lang)
  if (searchParams?.playerSuccess === "updated") return feedback("success", "Player updated.", lang)
  if (searchParams?.playerSuccess === "deleted") return feedback("success", "Player deleted.", lang)
  if (searchParams?.playerSuccess === "approved") return feedback("success", "Player profile approved.", lang)
  if (searchParams?.playerSuccess === "rejected") return feedback("success", "Player profile rejected.", lang)
  if (searchParams?.playerSuccess === "pending") return feedback("success", "Player profile restored to pending.", lang)
  if (!searchParams?.playerError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-player-name": "Player name must not be empty.",
      "invalid-player-seed": "Seed must be a positive integer when provided.",
      "invalid-wins": "Wins must be an integer greater than or equal to 0.",
      "invalid-losses": "Losses must be an integer greater than or equal to 0.",
      "missing-id": "Player id is missing.",
      "admin-client-unavailable": "Player mutations require a server-only Supabase admin client.",
      "mutation-failed": "Player change could not be saved. Please try again.",
    }[searchParams.playerError] ?? "Player change could not be saved."

  return feedback("error", message, lang)
}

export function getMatchFeedback(searchParams?: Pick<AdminSearchParams, "matchError" | "matchSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.matchSuccess === "created") return feedback("success", "Match created.", lang)
  if (searchParams?.matchSuccess === "updated") return feedback("success", "Match updated.", lang)
  if (searchParams?.matchSuccess === "deleted") return feedback("success", "Match deleted.", lang)
  if (searchParams?.matchSuccess === "bracket-generated") return feedback("success", "Bracket template generated.", lang)
  if (searchParams?.matchSuccess === "bracket-slot-updated") return feedback("success", "Bracket slot updated.", lang)
  if (searchParams?.matchSuccess === "bracket-locked") return feedback("success", "Bracket locked.", lang)
  if (searchParams?.matchSuccess === "bracket-unlocked") return feedback("success", "Bracket unlocked.", lang)
  if (searchParams?.matchSuccess === "bracket-match-updated") return feedback("success", "Bracket match updated.", lang)
  if (searchParams?.matchSuccess === "swiss-round-generated") return feedback("success", "Next Swiss round generated.", lang)
  if (searchParams?.matchSuccess === "playoffs-generated") return feedback("success", "Playoff bracket generated.", lang)
  if (!searchParams?.matchError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-team1": "Team 1 must not be empty.",
      "invalid-team2": "Team 2 must not be empty.",
      "duplicate-match-teams": "Team 1 and Team 2 must be different.",
      "invalid-score": "Scores must be whole numbers or left empty.",
      "invalid-status": "Status must be upcoming, live, or finished.",
      "invalid-match-order": "Match order must be a positive integer.",
      "invalid-participant-type": "Participant type must be team or player.",
      "invalid-winner": "Winner must be one of the match participants.",
      "finished-match-requires-scores": "Finished matches require both scores.",
      "finished-match-requires-participants":
        "Finished matches require matched participant records.",
      "tie-match-requires-winner": "Tied finished matches require a selected winner.",
      "winner-score-mismatch": "Winner must match the higher score.",
      "invalid-schedule": "Schedule date and time must both be valid or both be empty.",
      "invalid-timezone": "Timezone must be a valid IANA timezone.",
      "invalid-channel-type": "Channel type is invalid.",
      "invalid-channel-url": "Invalid channel URL",
      "invalid-bracket-size": "Bracket size must be 2, 4, 8, or 16 participants.",
      "unsupported-tournament-format": "This tournament format does not have a generation engine available.",
      "wrong-tournament-engine": "This action does not match the tournament format.",
      "swiss-round-incomplete": "Finish every match in the current Swiss round before generating the next one.",
      "swiss-round-limit-reached": "All configured Swiss rounds have already been generated.",
      "swiss-pairing-failed": "Swiss pairings could not be generated without repeat opponents.",
      "groups-incomplete": "Finish every group-stage match before generating playoffs.",
      "playoffs-already-generated": "Playoff matches have already been generated for this tournament.",
      "invalid-format-config": "Tournament format configuration is invalid.",
      "invalid-lobby-size": "Lobby size is invalid for this tournament.",
      "invalid-bracket": "Bracket id is missing.",
      "invalid-bracket-status": "Bracket status action is invalid.",
      "bracket-confirm-required":
        "This tournament already has a bracket. Confirm regeneration to replace the bracket template.",
      "invalid-bracket-chain": "Bracket template links could not be generated safely.",
      "invalid-bracket-slot": "Bracket slot must be 1 or 2.",
      "invalid-participant": "Participant must belong to this tournament and match type.",
      "bracket-match-not-found": "Bracket match could not be found for this tournament.",
      "not-bracket-match": "Only generated bracket matches can use slot assignment.",
      "finished-match-locked": "Finished matches cannot have bracket slots changed.",
      "bracket-locked": "This bracket is locked and cannot be edited.",
      "bracket-active-locked":
        "This bracket has live or finished matches and cannot be structurally edited.",
      "bracket-unlock-blocked":
        "Brackets cannot be unlocked after matches are live or finished.",
      "bracket-match-controls-locked":
        "Lock the bracket before editing bracket match status or scores.",
      "bracket-match-incomplete":
        "Assign both bracket slots before starting or finishing the match.",
      "duplicate-bracket-participant":
        "A participant cannot be assigned twice in the same bracket.",
      "bracket-propagation-target-locked":
        "Winner could not advance because the next bracket match has already started.",
      "bracket-propagation-conflict":
        "Winner could not advance because the next bracket slot already has a different participant.",
      "missing-id": "Match id is missing.",
      "admin-client-unavailable":
        "Match mutations require a server-only Supabase admin client.",
      "mutation-failed": "Match change could not be saved. Please try again.",
    }[searchParams.matchError] ?? "Match change could not be saved."

  return feedback("error", message, lang)
}

export function getResultFeedback(searchParams?: Pick<AdminSearchParams, "resultError" | "resultSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.resultSuccess === "created") return feedback("success", "Result created.", lang)
  if (searchParams?.resultSuccess === "updated") return feedback("success", "Result updated.", lang)
  if (searchParams?.resultSuccess === "deleted") return feedback("success", "Result deleted.", lang)
  if (!searchParams?.resultError) return null

  const message =
    {
      "invalid-tournament-id": "Tournament is required.",
      "invalid-result-team": "Team must not be empty.",
      "invalid-placement": "Placement must be a positive integer.",
      "invalid-participant-type": "Participant type must be team or player.",
      "missing-id": "Result id is missing.",
      "admin-client-unavailable":
        "Result mutations require a server-only Supabase admin client.",
      "mutation-failed": "Result change could not be saved. Please try again.",
    }[searchParams.resultError] ?? "Result change could not be saved."

  return feedback("error", message, lang)
}

export function getPlayerApplicationFeedback(searchParams?: Pick<AdminSearchParams, "playerApplicationError" | "playerApplicationSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.playerApplicationSuccess === "approved") return feedback("success", "Player application approved.", lang)
  if (searchParams?.playerApplicationSuccess === "rejected") return feedback("success", "Player application rejected.", lang)
  if (searchParams?.playerApplicationSuccess === "recent-decisions-cleared") return feedback("success", "Recent player application decisions cleared.", lang)
  if (!searchParams?.playerApplicationError) return null

  const message =
    {
      "missing-id": "Player application id is missing.",
      "invalid-status": "Player application decision must be approve or reject.",
      "already-reviewed": "This player application has already been reviewed.",
      "admin-client-unavailable":
        "Player application review requires a server-only Supabase admin client.",
      "mutation-failed": "Player application review could not be saved. Please try again.",
    }[searchParams.playerApplicationError] ?? "Player application review could not be saved."

  return feedback("error", message, lang)
}

export function getRegistrationFeedback(searchParams?: Pick<AdminSearchParams, "registrationError" | "registrationSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.registrationSuccess === "approved") return feedback("success", "Registration approved and added to participants.", lang)
  if (searchParams?.registrationSuccess === "rejected") return feedback("success", "Registration rejected.", lang)
  if (searchParams?.registrationSuccess === "recent-decisions-cleared") return feedback("success", "Recent registration decisions cleared.", lang)
  if (!searchParams?.registrationError) return null

  const message =
    {
      "missing-id": "Registration id is missing.",
      "invalid-status": "Registration decision must be approve or reject.",
      "already-reviewed": "This registration has already been reviewed.",
      "invalid-participant-type": "Tournament participant type is invalid.",
      "wrong-participant-type": "This registration does not match the tournament participant type.",
      "invalid-tournament-id": "Registration tournament could not be found.",
      "registration-closed": "This tournament is closed.",
      "registration-full": "This tournament is full.",
      "duplicate-registration": "This participant is already approved for the tournament.",
      "admin-client-unavailable":
        "Registration review requires a server-only Supabase admin client.",
      "mutation-failed": "Registration review could not be saved. Please try again.",
    }[searchParams.registrationError] ?? "Registration review could not be saved."

  return feedback("error", message, lang)
}

export function getDisputeFeedback(searchParams?: Pick<AdminSearchParams, "disputeError" | "disputeSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.disputeSuccess === "under_review") return feedback("success", "Dispute marked under review.", lang)
  if (searchParams?.disputeSuccess === "resolved") return feedback("success", "Dispute resolved.", lang)
  if (searchParams?.disputeSuccess === "rejected") return feedback("success", "Dispute rejected.", lang)
  if (searchParams?.disputeSuccess === "open") return feedback("success", "Dispute reopened.", lang)
  if (!searchParams?.disputeError) return null

  const message =
    {
      "missing-id": "Dispute id is missing.",
      "invalid-status": "Dispute status is invalid.",
      "admin-client-unavailable":
        "Dispute review requires a server-only Supabase admin client.",
      "mutation-failed": "Dispute review could not be saved. Please try again.",
    }[searchParams.disputeError] ?? "Dispute review could not be saved."

  return feedback("error", message, lang)
}

export function getParticipantFeedback(searchParams?: Pick<AdminSearchParams, "participantError" | "participantSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.participantSuccess === "deleted") return feedback("success", "Participant removed from tournament.", lang)
  if (searchParams?.participantSuccess === "created") return feedback("success", "Participant added successfully.", lang)
  if (!searchParams?.participantError) return null

  const message =
    {
      "missing-id": "Participant id is missing.",
      "admin-client-unavailable": "Participant mutations require a server-only Supabase admin client.",
      "participant-used-in-matches": "This participant is already used in generated matches. Reset the bracket before removing them.",
      "participant-already-exists": "This player/team is already added to this tournament.",
      "player-not-found": "Selected player was not found.",
      "team-not-found": "Selected team was not found.",
      "seed-already-used": "This seed is already used in this tournament.",
      "bracket-already-generated": "Participants cannot be added after the bracket has been generated. Reset the bracket first.",
      "invalid-seed": "Seed must be a positive integer.",
      "invalid-participant-data": "Participant details are invalid.",
      "mutation-failed": "Participant action failed. Please try again.",
    }[searchParams.participantError] ?? "Participant action failed."

  return feedback("error", message, lang)
}

export function getNewsFeedback(searchParams?: Pick<AdminSearchParams, "newsError" | "newsSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.newsSuccess === "created") return feedback("success", "News post created.", lang)
  if (searchParams?.newsSuccess === "updated") return feedback("success", "News post updated.", lang)
  if (searchParams?.newsSuccess === "published") return feedback("success", "News post published.", lang)
  if (searchParams?.newsSuccess === "archived") return feedback("success", "News post archived.", lang)
  if (searchParams?.newsSuccess === "deleted") return feedback("success", "News post deleted.", lang)
  if (!searchParams?.newsError) return null

  const message =
    {
      "invalid-title": "Title must not be empty.",
      "invalid-slug": "Slug must use lowercase letters, numbers, and hyphens.",
      "invalid-content": "Content must not be empty.",
      "invalid-status": "Status must be draft, published, or archived.",
      "invalid-published-at": "Published date must be valid.",
      "missing-id": "News post id is missing.",
      "confirm-published-delete": "Confirm deletion before deleting a published post.",
      "admin-client-unavailable":
        "News mutations require a server-only Supabase admin client.",
      "mutation-failed": "News post change could not be saved. Please try again.",
    }[searchParams.newsError] ?? "News post change could not be saved."

  return feedback("error", message, lang)
}

export function getPowerToolFeedback(searchParams?: Pick<AdminSearchParams, "toolError" | "toolSuccess">, lang: AdminFeedbackLanguage = "en"): AdminFeedback | null {
  if (searchParams?.toolSuccess === "participants-imported") {
    return feedback("success", lang === "uk" ? "Учасників імпортовано." : "Participants imported.", lang)
  }
  if (searchParams?.toolSuccess === "content-updated") {
    return feedback("success", lang === "uk" ? "Фронтенд-контент турніру оновлено." : "Tournament frontend content updated.", lang)
  }
  if (searchParams?.toolSuccess === "announcement-published") {
    return feedback("success", lang === "uk" ? "Анонс опубліковано." : "Announcement published.", lang)
  }
  if (!searchParams?.toolError) return null

  const isUk = lang === "uk"
  const message =
    {
      "missing-tournament": isUk ? "Оберіть турнір." : "Select a tournament.",
      "tournament-not-found": isUk ? "Турнір не знайдено." : "Tournament was not found.",
      "empty-import": isUk ? "Список імпорту порожній." : "Import list is empty.",
      "too-many-rows": isUk ? "За один раз можна імпортувати до 128 учасників." : "You can import up to 128 participants at once.",
      "invalid-import-row": isUk ? "Один із рядків імпорту некоректний." : "One import row is invalid.",
      "invalid-seed": isUk ? "Seed має бути додатнім числом." : "Seed must be a positive number.",
      "seed-already-used": isUk ? "Один із seed вже зайнятий." : "One seed is already used.",
      "duplicate-participant": isUk ? "У списку або турнірі є дубль учасника." : "The list or tournament contains a duplicate participant.",
      "slot-limit-exceeded": isUk ? "Імпорт перевищує кількість слотів турніру." : "Import exceeds tournament slot limit.",
      "bracket-already-generated": isUk ? "У турніру вже є сітка. Спершу скиньте або перегенеруйте її." : "This tournament already has a bracket. Reset or regenerate it first.",
      "invalid-title": isUk ? "Назва анонсу не може бути порожньою." : "Announcement title cannot be empty.",
      "invalid-content": isUk ? "Текст анонсу не може бути порожнім." : "Announcement content cannot be empty.",
      "invalid-url": isUk ? "Посилання має бути валідним URL." : "URL must be valid.",
      "admin-client-unavailable": isUk ? "Supabase admin client недоступний." : "Supabase admin client is unavailable.",
      "mutation-failed": isUk ? "Дію не вдалося зберегти. Спробуйте ще раз." : "The action could not be saved. Please try again.",
    }[searchParams.toolError] ?? (isUk ? "Дію не вдалося виконати." : "The action failed.")

  return feedback("error", message, lang)
}
