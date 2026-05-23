/**
 * Safely converts a team name into a unique URL-friendly slug.
 * E.g., "Liquid's Team #1!" -> "liquid-s-team-1"
 */
export function generateTeamSlug(name: string): string {
  if (!name) return "team"
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-word, non-space, non-hyphen chars
    .replace(/[\s_]+/g, "-")  // replace spaces and underscores with hyphens
    .replace(/-+/g, "-")      // collapse duplicate hyphens
    .replace(/^-+|-+$/g, "")  // trim leading/trailing hyphens
    || "team"
}
