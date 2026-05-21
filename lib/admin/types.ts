export type AdminFeedback = {
  tone: "success" | "error"
  message: string
}

export type AdminSearchParams = {
  error?: string
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
  activeError?: string
  activeSuccess?: string
}

export type AdminFormAction = (formData: FormData) => Promise<void>
