import type { Database } from "firebase/database";
import { ref } from "firebase/database";

/**
 * Root segment for quiz data in Realtime DB (rules must allow read/write under this path).
 * Override with NEXT_PUBLIC_FIREBASE_QUIZ_ROOT if your rules use a different key.
 */
export const FIREBASE_QUIZ_ROOT = process.env.NEXT_PUBLIC_FIREBASE_QUIZ_ROOT ?? "quiz";

/** e.g. quiz/3/view or tournament/quiz_scores/3/view */
export function quizDataPath(quizId: number | string, ...segments: string[]): string {
  return [FIREBASE_QUIZ_ROOT, String(quizId), ...segments].join("/");
}

export function quizDataRef(db: Database, quizId: number | string, ...segments: string[]) {
  return ref(db, quizDataPath(quizId, ...segments));
}
