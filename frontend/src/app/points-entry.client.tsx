"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { onValue, ref, set } from "firebase/database";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { setActiveQuizId } from "@/lib/activeQuiz";
import { apiPost } from "@/lib/api";
import type { PointRow, PointUpsertResponse, Quiz, Round, Team } from "@/lib/types";
import { db } from "@/lib/firebase";

const FALLBACK_IMG = "/next.svg";

type QuizDeep = Quiz & {
  teams: Team[];
  rounds: Round[];
  points: Array<{
    point_id: number;
    points: number;
    team: Pick<Team, "team_id" | "team_name" | "image" | "image_url">;
    round: Pick<Round, "round_id" | "round_name" | "maximum_score">;
  }>;
};

function safeImage(src: string | null | undefined) {
  return src || FALLBACK_IMG;
}

export function PointsEntryClient() {
  const searchParams = useSearchParams();
  const initialQuizId = useMemo(() => {
    const raw = searchParams.get("quiz_id");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [quizDeep, setQuizDeep] = useState<QuizDeep | null>(null);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [pointsDraft, setPointsDraft] = useState<Record<number, string>>({});
  const [savingTeamId, setSavingTeamId] = useState<number | null>(null);
  const [firebaseEnabled, setFirebaseEnabled] = useState(true);

  const rounds = useMemo(() => quizDeep?.rounds ?? [], [quizDeep]);
  const teams = useMemo(() => quizDeep?.teams ?? [], [quizDeep]);

  const selectedRound = useMemo(
    () => rounds.find((r) => r.round_id === roundId) || null,
    [rounds, roundId]
  );

  const pointsByTeamForRound = useMemo(() => {
    const map = new Map<number, { point_id: number; points: number }>();
    for (const p of quizDeep?.points ?? []) {
      if (p.round.round_id === roundId) {
        map.set(p.team.team_id, { point_id: p.point_id, points: p.points });
      }
    }
    return map;
  }, [quizDeep, roundId]);

  async function loadQuizzes() {
    const res = await apiPost<Quiz[]>("/api/quiz/get", {});
    if (!res.ok) return toast.error(res.error.message);
    setQuizzes(res.data);
    const chosen = initialQuizId ?? res.data[0]?.quiz_id ?? null;
    if (chosen) setQuizId(chosen);
  }

  async function loadQuizDeep(id: number) {
    const res = await apiPost<{ quiz_id: number } & { [k: string]: unknown }>(
      "/api/quiz/get",
      { quiz_id: id }
    );
    if (!res.ok) return toast.error(res.error.message);
    setQuizDeep(res.data as QuizDeep);
    if ((res.data as QuizDeep).rounds?.length) {
      setRoundId((res.data as QuizDeep).rounds[0]!.round_id);
    } else {
      setRoundId(null);
    }
  }

  async function refreshRoundPoints(id: number, rId: number) {
    const res = await apiPost<PointRow[]>("/api/points/get", {
      quiz_id: id,
      round_id: rId,
    });
    if (!res.ok) return toast.error(res.error.message);
    const points = res.data.map((p) => ({
      point_id: p.point_id,
      points: p.points,
      team: {
        team_id: p.team.team_id,
        team_name: p.team.team_name,
        image: p.team.image,
        image_url: p.team.image_url,
      },
      round: {
        round_id: p.round.round_id,
        round_name: p.round.round_name,
        maximum_score: p.round.maximum_score,
      },
    }));
    setQuizDeep((prev) => (prev ? ({ ...prev, points } as QuizDeep) : prev));
  }

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (quizId) loadQuizDeep(quizId);
  }, [quizId]);

  useEffect(() => {
    if (quizId) setActiveQuizId(quizId);
  }, [quizId]);

  useEffect(() => {
    if (!quizId || !roundId) return;
    refreshRoundPoints(quizId, roundId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  // Same trigger as scoreboard: any points change refetches this round (no manual refresh).
  useEffect(() => {
    if (!quizId || !roundId) return;
    if (!firebaseEnabled) return;
    const refreshRef = ref(db, `quiz/${quizId}/refresh_ts`);
    const unsub = onValue(
      refreshRef,
      (snap) => {
        const ts = snap.val() as number | null;
        if (!ts) return;
        refreshRoundPoints(quizId, roundId);
      },
      () => {
        setFirebaseEnabled(false);
      }
    );
    return () => unsub();
  }, [quizId, roundId, firebaseEnabled]);

  useEffect(() => {
    if (!roundId) return;
    const next: Record<number, string> = {};
    for (const t of teams) {
      const existing = pointsByTeamForRound.get(t.team_id);
      next[t.team_id] = existing ? String(existing.points) : "";
    }
    setPointsDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, teams.length]);

  const quizTitle = quizDeep?.name || "Quiz";
  const quizImg = safeImage(quizDeep?.image_url);
  const headerSubtitle = selectedRound
    ? `Points entry • ${selectedRound.round_name} (max ${selectedRound.maximum_score})`
    : "Points entry";

  async function upsertTeamPoints(teamId: number) {
    if (!quizId) return;
    if (!roundId) return toast.error("Please select a round first.");

    const raw = pointsDraft[teamId] ?? "";
    if (raw.trim() === "") return toast.error("Please enter points.");
    const points = Number(raw);
    if (!Number.isFinite(points) || points < 0) return toast.error("Points must be a valid number.");

    const existing = pointsByTeamForRound.get(teamId);
    setSavingTeamId(teamId);
    const res = await apiPost<PointUpsertResponse>("/api/points/upsert", {
      point_id: existing?.point_id,
      points,
      team_id: teamId,
      round_id: roundId,
    });
    setSavingTeamId(null);

    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Saved");
    await refreshRoundPoints(quizId, roundId);

    // Trigger scoreboard refresh (LED screen) via Firebase.
    if (firebaseEnabled) {
      try {
        await set(ref(db, `quiz/${quizId}/refresh_ts`), Date.now());
      } catch (err: unknown) {
        setFirebaseEnabled(false);
        console.warn(
          "Firebase disabled:",
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  async function openScoreboard(mode: { type: "all" } | { type: "round"; round_id: number }) {
    if (!quizId) return;
    const view = mode.type === "all" ? { mode: "all" } : { mode: "round", round_id: mode.round_id };
    if (firebaseEnabled) {
      try {
        await set(ref(db, `quiz/${quizId}/view`), {
          ...view,
          ts: Date.now(),
        });
      } catch (err: unknown) {
        setFirebaseEnabled(false);
        console.warn(
          "Firebase disabled:",
          err instanceof Error ? err.message : String(err)
        );
        toast.error("Live view disabled (Firebase permission denied).");
      }
    }
    const qs =
      mode.type === "all"
        ? `quiz_id=${quizId}&mode=all`
        : `quiz_id=${quizId}&mode=round&round_id=${mode.round_id}`;
    window.open(`/scoreboard?${qs}`, "_blank");
  }

  return (
    <AppShell
      title={quizTitle}
      imageUrl={quizImg}
      variant="scoreboard"
      subtitle={headerSubtitle}
      // right={quizId ? `Quiz ID: ${quizId}` : null}
    >
      <Toaster
        position="top-center"
        containerClassName="!top-[max(0.5rem,env(safe-area-inset-top))] sm:!top-4"
        toastOptions={{ style: { maxWidth: "min(100vw - 2rem, 360px)" } }}
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <Card
          title="Quiz & Round"
          right={
            selectedRound ? (
              <div className="text-xs text-white">{selectedRound.round_name}</div>
            ) : null
          }
        >
          <div className="grid gap-3">
            {/* Quiz select hidden for now (single-quiz flow). */}
            {/*
              <label className="grid gap-1 text-sm">
                <span className="text-white">Quiz</span>
                <select
                  value={quizId ?? ""}
                  onChange={(e) => setQuizId(Number(e.target.value))}
                  className="h-11 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-zinc-50 outline-none focus:border-sky-400/50"
                >
                  {quizzes.map((q) => (
                    <option key={q.quiz_id} value={q.quiz_id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </label>
            */}

            <label className="grid gap-1 text-sm">
              <span className="text-white">Round</span>
              <select
                value={roundId ?? ""}
                onChange={(e) => setRoundId(Number(e.target.value))}
                className="h-12 min-h-11 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-base text-zinc-50 outline-none focus:border-sky-400/50 sm:h-11 sm:text-sm"
              >
                {rounds.map((r) => (
                  <option key={r.round_id} value={r.round_id}>
                    {r.round_name} (max {r.maximum_score})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => openScoreboard({ type: "all" })}
                className="h-12 touch-manipulation rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 sm:h-11 sm:min-w-0 sm:flex-1"
              >
                Open: All rounds
              </button>

              <button
                type="button"
                onClick={() => (roundId ? openScoreboard({ type: "round", round_id: roundId }) : null)}
                className="h-12 touch-manipulation rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 sm:h-11 sm:flex-1"
              >
                Open: This round
              </button>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card
            title={`Teams${selectedRound ? ` • ${selectedRound.round_name}` : ""}`}
            right={
              <div className="text-xs text-white">
                {teams.length ? `${teams.length} teams` : "No teams"}
              </div>
            }
          >
            <div className="grid gap-3">
              {teams.map((t) => {
                const existing = pointsByTeamForRound.get(t.team_id);
                const isSaving = savingTeamId === t.team_id;
                return (
                  <motion.div
                    key={t.team_id}
                    layout
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <Image
                          src={safeImage(t.image_url)}
                          alt={t.team_name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{t.team_name}</div>
                        <div className="text-xs text-white">
                          {existing ? `Saved: ${existing.points}` : "Not saved yet"}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <input
                        inputMode="numeric"
                        value={pointsDraft[t.team_id] ?? ""}
                        onChange={(e) =>
                          setPointsDraft((p) => ({ ...p, [t.team_id]: e.target.value }))
                        }
                        placeholder="Points"
                        className="h-12 min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-base text-zinc-50 outline-none focus:border-sky-400/50 sm:h-11 sm:w-40 sm:text-sm"
                      />
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => upsertTeamPoints(t.team_id)}
                        className="h-12 shrink-0 touch-manipulation rounded-xl bg-sky-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-sky-300 disabled:opacity-60 sm:h-11"
                      >
                        {isSaving ? "Saving..." : existing ? "Update" : "Submit"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

