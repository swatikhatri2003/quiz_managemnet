"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { onValue } from "firebase/database";

import { getActiveQuizId } from "@/lib/activeQuiz";
import { apiPost } from "@/lib/api";
import { db } from "@/lib/firebase";
import { quizDataRef } from "@/lib/firebaseQuizPath";
import type { Quiz, Round, Team } from "@/lib/types";

const TEAMS_PER_PAGE = 12; // 4 cards/row => 3 rows on 1080p typically
const ROTATE_MS = 9000;

type ViewState =
  | { mode: "all"; ts?: number }
  | { mode: "round"; round_id: number; ts?: number };

type QuizMeta = {
  quiz_id: number;
  name: string;
  image: string | null;
  image_url: string | null;
  rounds: Round[];
};

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

export function ScoreboardClient() {
  const searchParams = useSearchParams();
  const initialQuizId = useMemo(() => {
    const raw = searchParams.get("quiz_id");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const initialView = useMemo<ViewState>(() => {
    const mode = searchParams.get("mode");
    if (mode === "round") {
      const raw = searchParams.get("round_id");
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) return { mode: "round", round_id: n };
    }
    return { mode: "all" };
  }, [searchParams]);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [quizDeep, setQuizDeep] = useState<QuizDeep | null>(null);
  const [view, setView] = useState<ViewState>(initialView);
  const [firebaseListenOk, setFirebaseListenOk] = useState(true);
  const [pageCursor, setPageCursor] = useState(0);

  async function loadQuizzes() {
    const res = await apiPost<Quiz[]>("/quiz/get", {});
    if (!res.ok) return toast.error(res.error.message);
    setQuizzes(res.data);
    const ids = new Set(res.data.map((q) => q.quiz_id));
    const fromSession = getActiveQuizId();
    const sessionOk = fromSession && ids.has(fromSession) ? fromSession : null;
    // URL → last quiz used on points entry → API default (newest id first).
    const chosen = initialQuizId ?? sessionOk ?? res.data[0]?.quiz_id ?? null;
    if (chosen) setQuizId(chosen);
  }

  async function loadQuizDeep(id: number) {
    const res = await apiPost<QuizMeta & { [k: string]: unknown }>("/quiz/get", {
      quiz_id: id,
    });
    if (!res.ok) return toast.error(res.error.message);
    setQuizDeep(res.data as QuizDeep);
  }

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (!quizId) return;
    loadQuizDeep(quizId);

    if (!firebaseListenOk) return;

    // Live LED: operator (points entry) writes `view`; scoreboard always follows Firebase.
    const viewRef = quizDataRef(db, quizId, "view");
    const unsub = onValue(
      viewRef,
      (snap) => {
        const val = snap.val() as ViewState | null;
        if (!val) return;
        if (val?.mode === "round" && typeof val.round_id === "number") {
          setView({ mode: "round", round_id: val.round_id, ts: val.ts });
        } else {
          setView({ mode: "all", ts: val?.ts });
        }
      },
      (err) => {
        setFirebaseListenOk(false);
        console.warn("Firebase listen:", err?.message || err);
        toast.error("Live view listen denied — check Realtime Database rules for quiz path.");
      }
    );

    return () => unsub();
  }, [quizId, firebaseListenOk]);

  useEffect(() => {
    if (!quizId) return;
    if (!firebaseListenOk) return;

    const refreshRef = quizDataRef(db, quizId, "refresh_ts");
    const unsub = onValue(
      refreshRef,
      (snap) => {
        const ts = snap.val() as number | null;
        if (!ts) return;
        loadQuizDeep(quizId);
      },
      (err) => {
        setFirebaseListenOk(false);
        console.warn("Firebase listen:", err?.message || err);
      }
    );

    return () => unsub();
  }, [quizId, firebaseListenOk]);

  const quizTitle = quizDeep?.name || "Scoreboard";
  const rounds = useMemo(() => quizDeep?.rounds ?? [], [quizDeep]);
  const teams = useMemo(() => quizDeep?.teams ?? [], [quizDeep]);
  const points = useMemo(() => quizDeep?.points ?? [], [quizDeep]);

  const roundsToShow = useMemo(() => {
    if (view.mode === "round") return rounds.filter((r) => r.round_id === view.round_id);
    return rounds;
  }, [rounds, view]);

  const scoreByTeamRound = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of points) {
      m.set(`${p.team.team_id}:${p.round.round_id}`, p.points);
    }
    return m;
  }, [points]);

  // Reset paging when view/quiz changes.
  useEffect(() => {
    setPageCursor(0);
  }, [view.mode, view.mode === "round" ? view.round_id : "all", quizId]);

  // Auto-rotate pages (LED-friendly: no scroll).
  useEffect(() => {
    if (teams.length === 0) return;
    const t = setInterval(() => {
      const pages = Math.max(1, Math.ceil(teams.length / TEAMS_PER_PAGE));
      setPageCursor((p) => (p + 1) % pages);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [teams.length]);

  const pageTeams = useMemo(() => {
    const start = pageCursor * TEAMS_PER_PAGE;
    return teams.slice(start, start + TEAMS_PER_PAGE);
  }, [pageCursor, teams]);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-white-950 text-white md:h-screen md:overflow-hidden">
      <Toaster
        position="top-center"
        containerClassName="!top-[max(0.5rem,env(safe-area-inset-top))] sm:!top-4"
        toastOptions={{ style: { maxWidth: "min(100vw - 2rem, 360px)" } }}
      />

      <header className="relative grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-8 sm:py-0 sm:pt-0 md:h-[96px] md:py-0">
        {/* Sponsor logos */}
        <div className="pointer-events-none absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex items-center gap-2 sm:left-8 sm:top-3 md:top-4">
          <div className="rounded-xl bg-white/95 px-2 py-1 shadow-sm ring-1 ring-black/10 backdrop-blur">
            <img
              src="/Rotary%20logo.png"
              alt="Rotary"
              className="h-10 w-auto sm:h-11 md:h-12"
              loading="eager"
            />
          </div>
          <div className="rounded-xl bg-white/95 px-2 py-1 shadow-sm ring-1 ring-black/10 backdrop-blur">
            <img
              src="/Disha%20logo.png"
              alt="Disha"
              className="h-10 w-auto sm:h-11 md:h-12"
              loading="eager"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex items-center sm:right-8 sm:top-3 md:top-4">
          <div className="rounded-xl bg-white/95 px-2 py-1 shadow-sm ring-1 ring-black/10 backdrop-blur">
            <img
              src="/Ilead%20Logo.png"
              alt="iLead"
              className="h-10 w-auto sm:h-11 md:h-12"
              loading="eager"
            />
          </div>
        </div>

        <div />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center justify-center gap-3 sm:gap-4">
            {/* <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:h-14 sm:w-14">
              <div className="flex h-full w-full items-center justify-center text-base font-semibold text-white sm:text-lg">
                {quizTitle?.trim()?.[0]?.toUpperCase() ?? "Q"}
              </div>
            </div> */}
            <div className="min-w-0 text-center">
              <div className="truncate text-lg font-semibold tracking-tight sm:text-2xl">{quizTitle}</div>
              <div className="text-xs leading-snug text-white/70 sm:text-sm">
                {view.mode === "round"
                  ? `This round • ${roundsToShow[0]?.round_name ?? `Round ${view.round_id}`}`
                  : "All rounds"}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden control: keeps ability to switch quiz from URL debugging */}
        <div className="hidden">
          <select value={quizId ?? ""} onChange={(e) => setQuizId(Number(e.target.value))}>
            {quizzes.map((q) => (
              <option key={q.quiz_id} value={q.quiz_id}>
                {q.name}
              </option>
            ))}
          </select>
        </div>

        {/* <div className="text-sm text-white/70">
          Page {pageCursor + 1}/{Math.max(1, Math.ceil(teams.length / TEAMS_PER_PAGE))}
        </div> */}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 md:h-[calc(100dvh-96px)] md:flex-none md:overflow-hidden lg:h-[calc(100dvh-96px)]">
        <div className="pointer-events-none absolute bottom-3 right-4 z-10 sm:bottom-4 sm:right-8">
          <div className="rounded-xl bg-white/95 px-2 py-1 shadow-sm ring-1 ring-black/10 backdrop-blur">
            <img
              src="/Vyana%20Logo.png"
              alt="Vyana"
              className="h-11 w-auto sm:h-12 md:h-14"
              loading="eager"
            />
          </div>
        </div>

        {quizId && !quizDeep ? (
          <div className="text-base text-white/80 sm:text-lg">Loading…</div>
        ) : teams.length === 0 ? (
          <div className="text-base text-white/80 sm:text-lg">No teams found.</div>
        ) : (
          <div className="grid grid-cols-1 content-start items-start gap-3 pb-[env(safe-area-inset-bottom)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageTeams.map((t) => (
              <TeamScoreCard
                key={t.team_id}
                team={t}
                rounds={roundsToShow}
                scoreByTeamRound={scoreByTeamRound}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TeamScoreCard({
  team,
  rounds,
  scoreByTeamRound,
}: {
  team: Team;
  rounds: Round[];
  scoreByTeamRound: Map<string, number>;
}) {
  const isSingleRound = rounds.length === 1;
  const onlyRound = isSingleRound ? rounds[0]! : null;
  const onlyScore = onlyRound
    ? scoreByTeamRound.get(`${team.team_id}:${onlyRound.round_id}`)
    : undefined;

  const totalScore = useMemo(() => {
    let sum = 0;
    let hasAny = false;
    for (const r of rounds) {
      const v = scoreByTeamRound.get(`${team.team_id}:${r.round_id}`);
      if (typeof v === "number") {
        sum += v;
        hasAny = true;
      }
    }
    return hasAny ? sum : null;
  }, [rounds, scoreByTeamRound, team.team_id]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      {isSingleRound && onlyRound ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:h-9 sm:w-9">
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white sm:text-sm">
                {team.team_name?.trim()?.[0]?.toUpperCase() ?? "T"}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-baseline gap-2">
                <div className="min-w-0 truncate text-base font-semibold leading-tight sm:text-xl">
                  {team.team_name}
                </div>
                <div className="shrink-0 text-[11px] font-semibold tabular-nums text-white/70 sm:text-xs">
                  Total: {totalScore ?? "-"}
                </div>
              </div>
              <div className="mt-1 truncate text-[11px] text-white/70 sm:text-xs">{onlyRound.round_name}</div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-bold tabular-nums leading-none text-sky-300 sm:text-2xl">
              {typeof onlyScore === "number" ? onlyScore : "-"}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:h-9 sm:w-9">
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white sm:text-sm">
                {team.team_name?.trim()?.[0]?.toUpperCase() ?? "T"}
              </div>
            </div>
            <div className="min-w-0 flex-1 truncate text-base font-semibold leading-tight sm:text-xl">
              {team.team_name}
            </div>
            <div className="shrink-0 text-xs font-semibold tabular-nums text-white/70">
              Total: {totalScore ?? "-"}
            </div>
          </div>
          {/* Rounds live inside the same card (no separate inner panel). */}
          <div className="mt-2 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] text-xs">
              {rounds.length ? (
                rounds.map((r, idx) => {
                  const score = scoreByTeamRound.get(`${team.team_id}:${r.round_id}`);
                  const showBorder = idx !== rounds.length - 1;
                  return (
                    <div
                      key={r.round_id}
                      className={`contents ${showBorder ? "[&>*]:border-b [&>*]:border-white/10" : ""}`}
                    >
                      <div className="truncate py-1 pr-3 text-white/85">{r.round_name}</div>
                      <div className="py-1 text-right font-bold tabular-nums text-sky-300">
                        {typeof score === "number" ? score : "-"}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="py-1 text-white/70">No rounds</div>
                  <div className="py-1 text-right text-white/70">-</div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-1 text-[11px] text-white/50">
        {firebaseListenLabel()}
      </div>
    </div>
  );
}

function firebaseListenLabel() {
  // Pure UI helper. Keep it static (no hooks) so cards don’t re-render often.
  return "Live";
}
