import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

export const ADMIN_SESSION_COOKIE = "eclyps_admin_session"

const ADMIN_SESSION_PAYLOAD = "eclyps-admin-session-v1"

export function isAdminPasswordConfigured() {
  return Boolean(getAdminPassword())
}

export function isValidAdminPassword(candidate: FormDataEntryValue | null) {
  const adminPassword = getAdminPassword()

  if (!adminPassword || typeof candidate !== "string") {
    return false
  }

  return safeCompare(candidate, adminPassword)
}

export function createAdminSessionValue() {
  const adminPassword = getAdminPassword()

  if (!adminPassword) {
    return null
  }

  return createHmac("sha256", adminPassword)
    .update(ADMIN_SESSION_PAYLOAD)
    .digest("hex")
}

export function isValidAdminSession(value: string | undefined) {
  const expectedValue = createAdminSessionValue()

  if (!expectedValue || !value) {
    return false
  }

  return safeCompare(value, expectedValue)
}

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD

  return typeof password === "string" && password.length > 0 ? password : null
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
