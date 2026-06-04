/**
 * Dynamic notification localization helper.
 * Translates notification titles and messages dynamically in the client UI
 * based on the active language (Ukrainian or English).
 */
export function getLocalizedNotification(
  notification: { type: string; title: string; message: string },
  lang: string
): { title: string; message: string } {
  if (lang !== "uk" && lang !== "ua") {
    // Return original English
    return { title: notification.title, message: notification.message }
  }

  // Translate to Ukrainian
  switch (notification.type) {
    case "player_approved": {
      const match = notification.message.match(/"([^"]+)"/)
      const name = match ? match[1] : ""
      return {
        title: "Профіль гравця схвалено",
        message: name ? `Ваш профіль гравця "${name}" було схвалено.` : "Ваш профіль гравця було схвалено.",
      }
    }
    case "player_rejected": {
      const match = notification.message.match(/"([^"]+)"/)
      const name = match ? match[1] : ""
      return {
        title: "Профіль гравця відхилено",
        message: name ? `Ваш профіль гравця "${name}" було відхилено.` : "Ваш профіль гравця було відхилено.",
      }
    }
    case "team_approved": {
      const match = notification.message.match(/"([^"]+)"/)
      const name = match ? match[1] : ""
      return {
        title: "Команду схвалено",
        message: name ? `Вашу команду "${name}" було схвалено.` : "Вашу команду було схвалено.",
      }
    }
    case "team_rejected": {
      const match = notification.message.match(/"([^"]+)"/)
      const name = match ? match[1] : ""
      return {
        title: "Команду відхилено",
        message: name ? `Вашу команду "${name}" було відхилено.` : "Вашу команду було відхилено.",
      }
    }
    case "registration_approved": {
      const match = notification.message.match(/"([^"]+)"/)
      const tName = match ? match[1] : "турнір"
      return {
        title: "Реєстрацію схвалено",
        message: `Вашу реєстрацію на турнір "${tName}" було схвалено!`,
      }
    }
    case "registration_rejected": {
      const match = notification.message.match(/"([^"]+)"/)
      const tName = match ? match[1] : "турнір"
      return {
        title: "Реєстрацію відхилено",
        message: `Вашу реєстрацію на турнір "${tName}" було відхилено.`,
      }
    }
    case "match_scheduled": {
      const tMatch = notification.message.match(/"([^"]+)"/)
      const tName = tMatch ? tMatch[1] : "турнір"

      const roundMatch = notification.message.match(/round\s+([^\s]+)/i)
      const round = roundMatch ? roundMatch[1] : ""

      const timeParts = notification.message.split("scheduled/updated: ")
      const formattedTime = timeParts.length > 1 ? timeParts[1] : ""

      // Translate English day/month/terms into Ukrainian
      let localizedTime = formattedTime
        .replace(/Sunday/g, "неділю")
        .replace(/Monday/g, "понеділок")
        .replace(/Tuesday/g, "вівторок")
        .replace(/Wednesday/g, "середу")
        .replace(/Thursday/g, "четвер")
        .replace(/Friday/g, "п'ятницю")
        .replace(/Saturday/g, "суботу")
        .replace(/January/g, "січня")
        .replace(/February/g, "лютого")
        .replace(/March/g, "березня")
        .replace(/April/g, "квітня")
        .replace(/May/g, "травня")
        .replace(/June/g, "червня")
        .replace(/July/g, "липня")
        .replace(/August/g, "серпня")
        .replace(/September/g, "вересня")
        .replace(/October/g, "жовтня")
        .replace(/November/g, "листопада")
        .replace(/December/g, "грудня")
        .replace(/at\s+/g, "о ")
        .replace(/Kyiv\s+time/g, "за київським часом")

      const roundStr = round ? ` у раунді ${round}` : ""
      return {
        title: "Матч заплановано",
        message: `Ваш матч${roundStr} турніру "${tName}" було заплановано/оновлено: ${localizedTime}.`,
      }
    }
    case "team_invite_received": {
      const match = notification.message.match(/"([^"]+)"/)
      const teamName = match ? match[1] : "команду"
      return {
        title: "Нове запрошення в команду",
        message: `Вас запросили приєднатися до команди "${teamName}".`,
      }
    }
    case "team_invite_accepted": {
      const match = notification.message.match(/"([^"]+)"/)
      const playerName = match ? match[1] : "Гравець"
      return {
        title: "Запрошення прийнято",
        message: `Гравець "${playerName}" прийняв ваше запрошення приєднатися до команди.`,
      }
    }
    case "team_invite_declined": {
      const match = notification.message.match(/"([^"]+)"/)
      const playerName = match ? match[1] : "Гравець"
      return {
        title: "Запрошення відхилено",
        message: `Гравець "${playerName}" відхилив ваше запрошення приєднатися до команди.`,
      }
    }
    case "team_invite_cancelled": {
      const match = notification.message.match(/"([^"]+)"/)
      const teamName = match ? match[1] : "команди"
      return {
        title: "Запрошення скасовано",
        message: `Ваше запрошення приєднатися до команди "${teamName}" було скасовано.`,
      }
    }
    case "team_join_request_received": {
      const matches = Array.from(notification.message.matchAll(/"([^"]+)"/g))
      const playerName = matches[0]?.[1] || "гравець"
      const teamName = matches[1]?.[1] || "команди"
      return {
        title: "Нова заявка до команди",
        message: `Гравець "${playerName}" подав заявку до команди "${teamName}".`,
      }
    }
    case "team_join_request_approved": {
      const match = notification.message.match(/"([^"]+)"/)
      const teamName = match ? match[1] : "команди"
      return {
        title: "Заявку схвалено",
        message: `Вашу заявку до команди "${teamName}" було схвалено.`,
      }
    }
    case "team_join_request_rejected": {
      const match = notification.message.match(/"([^"]+)"/)
      const teamName = match ? match[1] : "команди"
      return {
        title: "Заявку відхилено",
        message: `Вашу заявку до команди "${teamName}" було відхилено.`,
      }
    }
    case "team_join_request_cancelled": {
      const matches = Array.from(notification.message.matchAll(/"([^"]+)"/g))
      const playerName = matches[0]?.[1] || "гравець"
      const teamName = matches[1]?.[1] || "команди"
      return {
        title: "Заявку скасовано",
        message: `Гравець "${playerName}" скасував заявку до команди "${teamName}".`,
      }
    }
    case "team_member_removed": {
      return {
        title: "Вас видалено з команди",
        message: "Вас видалено зі складу команди.",
      }
    }
    case "team_role_updated": {
      const match = notification.message.match(/"([^"]+)"/)
      const role = localizeRole(match ? match[1] : "")
      return {
        title: "Роль оновлено",
        message: role
          ? `Вашу роль у складі команди оновлено на "${role}".`
          : "Вашу роль у складі команди оновлено.",
      }
    }
    case "team_member_left": {
      const playerName = notification.message.match(/^(.+?) left the team\./)?.[1] || "Гравець"
      return {
        title: "Учасник покинув команду",
        message: `${playerName} покинув команду.`,
      }
    }
    default:
      return { title: notification.title, message: notification.message }
  }
}

function localizeRole(role: string) {
  if (role === "Captain") return "Капітан"
  if (role === "Substitute") return "Запасний"
  if (role === "Member") return "Учасник"
  return role
}
