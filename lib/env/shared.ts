export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EnvValidationError"
  }
}

export function readRequiredEnv(name: string, value: string | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new EnvValidationError(`${name} is required.`)
  }

  return value.trim()
}

export function readOptionalEnv(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function readUrlEnv(name: string, value: string | undefined) {
  const rawValue = readRequiredEnv(name, value)

  try {
    return new URL(rawValue).toString()
  } catch {
    throw new EnvValidationError(`${name} must be a valid absolute URL.`)
  }
}

export function readOptionalUrlEnv(name: string, value: string | undefined) {
  const rawValue = readOptionalEnv(value)
  if (!rawValue) return null

  try {
    return new URL(rawValue).toString()
  } catch {
    throw new EnvValidationError(`${name} must be a valid absolute URL when set.`)
  }
}

export function readMinimumLengthEnv(
  name: string,
  value: string | undefined,
  minimumLength: number,
) {
  const rawValue = readRequiredEnv(name, value)

  if (rawValue.length < minimumLength) {
    throw new EnvValidationError(
      `${name} must be at least ${minimumLength} characters long.`,
    )
  }

  return rawValue
}
