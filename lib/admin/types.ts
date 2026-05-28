export type AdminFeedback = {
  tone: "success" | "error"
  message: string
}

export type AdminAuthHealth = {
  passwordHashPresent: boolean
  sessionSecretPresent: boolean
  passwordHashFormatValid: boolean
  sessionSecretFormatValid: boolean
  sessionCookieReadable: boolean
  passwordHashEscapedDollarSigns: boolean
}

export type AdminSearchParams = {
  error?: string
  retryAfter?: string
  crudError?: string
  crudSuccess?: string
  teamError?: string
  teamSuccess?: string
  playerError?: string
  playerSuccess?: string
  playerApplicationError?: string
  playerApplicationSuccess?: string
  matchError?: string
  matchSuccess?: string
  bracketError?: string
  bracketSuccess?: string
  resultError?: string
  resultSuccess?: string
  registrationError?: string
  registrationSuccess?: string
  registrationFilter?: string
  disputeError?: string
  disputeSuccess?: string
  activeError?: string
  activeSuccess?: string
  participantError?: string
  participantSuccess?: string
  newsError?: string
  newsSuccess?: string
}

export type AdminFormAction = (formData: FormData) => Promise<void>
