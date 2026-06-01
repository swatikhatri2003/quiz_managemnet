/**
 * API sometimes returns `origin/uploads/teams/` + an absolute CDN URL stored in DB.
 * When `/uploads/teams/` is followed by http(s), use only that inner URL.
 */
export function resolveTeamImageUrl(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === "") return "";
  const u = raw.trim();
  const marker = "/uploads/teams/";
  const idx = u.indexOf(marker);
  if (idx !== -1) {
    const after = u.slice(idx + marker.length);
    if (/^https?:\/\//i.test(after)) return after;
  }
  return u;
}
