/** Keeps scoreboard and points entry on the same quiz when URL omits quiz_id (cross-tab). */
const KEY = "qm_active_quiz_id";

export function setActiveQuizId(quizId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, String(quizId));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getActiveQuizId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
