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
import { resolveTeamImageUrl } from "@/lib/teamImageUrl";
import type { Quiz, Round, Team } from "@/lib/types";

const TEAMS_PER_PAGE = 12; // 4 cards/row => 3 rows on 1080p typically
const ROTATE_MS = 9000;

type ViewState =
  | { mode: "all"; ts?: number }
  | { mode: "round"; round_id: number; ts?: number }
  | { mode: "total"; ts?: number };

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

/** Badge initials: 1st letter of word 1 + 1st letter of word 2; one word → first two letters of that word. */
function teamInitials(raw: string | null | undefined): string {
  const s = raw?.trim() ?? "";
  if (!s) return "TT";
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = (words[0]![0] ?? "").toUpperCase();
    const b = (words[1]![0] ?? "").toUpperCase();
    return `${a}${b}`;
  }
  const w = words[0] ?? "";
  if (w.length >= 2) return `${w[0]!.toUpperCase()}${w[1]!.toUpperCase()}`;
  const c = (w[0] ?? "T").toUpperCase();
  return `${c}${c}`;
}

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
    if (mode === "total") return { mode: "total" };
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
        } else if (val?.mode === "total") {
          setView({ mode: "total", ts: val?.ts });
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

  const rounds = useMemo(() => quizDeep?.rounds ?? [], [quizDeep]);
  const scoreboardHeading =
    view.mode === "total"
      ? "Total Points"
      : view.mode === "round"
        ? rounds.find((r) => r.round_id === view.round_id)?.round_name ?? ""
        : "";
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

  const viewPagingKey =
    view.mode === "round"
      ? view.round_id
      : view.mode === "total"
        ? "total"
        : "all";

  // Reset paging when view/quiz changes.
  useEffect(() => {
    setPageCursor(0);
  }, [viewPagingKey, quizId]);

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

    const computeTotal = (teamId: number) => {
      let sum = 0;
      for (const r of rounds) {
        const v = scoreByTeamRound.get(`${teamId}:${r.round_id}`);
        if (typeof v === "number") sum += v;
      }
      return sum;
    };

    const displayTeams =
      view.mode === "total"
        ? [...teams].sort((a, b) => {
            const ta = computeTotal(a.team_id);
            const tb = computeTotal(b.team_id);
            const na = ta;
            const nb = tb;
            if (nb !== na) return nb - na;
            return (a.team_name ?? "").localeCompare(b.team_name ?? "");
          })
        : teams;

    return displayTeams.slice(start, start + TEAMS_PER_PAGE);
  }, [pageCursor, rounds, scoreByTeamRound, teams, view.mode]);

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#050507] text-white">
      {/* Render everything inside the visible background image frame (16:9), so cards never spill outside the image area */}
      <div
        className="relative h-[100dvh] w-full max-w-[min(100vw,calc(100dvh*1.7778))] overflow-hidden"
        style={{
          backgroundImage:
            'url("https://mscsuper.blr1.cdn.digitaloceanspaces.com/sponsors/Background.png")',
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#050507",
        }}
      >
        {/* Balloons overlay (animated) */}
        <div className="pointer-events-none absolute inset-0 z-0 animated-balloons opacity-50" />

        <Toaster
          position="top-center"
          containerClassName="!top-[max(0.5rem,env(safe-area-inset-top))] sm:!top-4"
          toastOptions={{ style: { maxWidth: "min(100vw - 2rem, 360px)" } }}
        />

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

        <main className="relative z-10 flex h-full w-full items-center justify-center overflow-y-auto px-[5px]">
          <div className="flex w-full items-center justify-center pt-[clamp(64px,12vh,160px)] pb-[clamp(28px,6vh,96px)]">
            {quizId && !quizDeep ? (
              <div className="text-base text-white/80 sm:text-lg">Loading…</div>
            ) : teams.length === 0 ? (
              <div className="text-base text-white/80 sm:text-lg">No teams found.</div>
            ) : (
              <div className="flex w-full flex-col items-stretch gap-4">
                {scoreboardHeading ? (
                  <h2 className="text-center text-xxl font-bold tracking-tight text-white drop-shadow sm:text-2xl lg:text-3xl">
                    {scoreboardHeading}
                  </h2>
                ) : null}
                <div
                  className={`grid w-full grid-cols-1 items-start gap-3 p-3 pb-[env(safe-area-inset-bottom)] sm:grid-cols-2 ${
                    view.mode === "round" || view.mode === "total"
                      ? "lg:grid-cols-2 xl:grid-cols-2"
                      : "lg:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
                {pageTeams.map((t) => (
                  <TeamScoreCard
                    key={t.team_id}
                    team={t}
                    rounds={roundsToShow}
                    scoreByTeamRound={scoreByTeamRound}
                    viewMode={view.mode}
                  />
                ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function TeamScoreCard({
  team,
  rounds,
  scoreByTeamRound,
  viewMode,
}: {
  team: Team;
  rounds: Round[];
  scoreByTeamRound: Map<string, number>;
  viewMode: ViewState["mode"];
}) {
  const isSingleRound = rounds.length === 1;
  const onlyRound = isSingleRound ? rounds[0]! : null;
  const onlyScore = onlyRound
    ? scoreByTeamRound.get(`${team.team_id}:${onlyRound.round_id}`)
    : undefined;

  const totalScore = useMemo(() => {
    let sum = 0;
    for (const r of rounds) {
      const v = scoreByTeamRound.get(`${team.team_id}:${r.round_id}`);
      if (typeof v === "number") sum += v;
    }
    return sum;
  }, [rounds, scoreByTeamRound, team.team_id]);

  const avatarSrc = resolveTeamImageUrl(team.image_url);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      {viewMode === "total" ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
              <img src={avatarSrc} alt={team.team_name ?? ""} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 whitespace-normal break-words text-lg font-semibold leading-snug text-white sm:text-xl">
              {team.team_name}
            </div>
          </div>
          <div className="shrink-0 self-center text-right">
            <div className="text-3xl font-bold tabular-nums leading-none text-amber-300 sm:text-4xl lg:text-5xl">
              {totalScore}
            </div>
          </div>
        </div>
      ) : isSingleRound && onlyRound ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
              <img src={avatarSrc} alt={team.team_name ?? ""} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 whitespace-normal break-words text-lg font-semibold leading-snug text-white sm:text-xl">
              {team.team_name}
            </div>
          </div>
          <div className="shrink-0 self-center text-right">
            <div className="text-3xl font-bold tabular-nums leading-none text-amber-300 sm:text-4xl lg:text-5xl">
              {typeof onlyScore === "number" ? onlyScore : 0}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-8 min-w-[2.125rem] shrink-0 items-center justify-center overflow-hidden rounded-lg px-0.5 sm:h-9 sm:min-w-[2.375rem]">
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold leading-none tracking-tight text-white sm:text-xs">
                <img src={avatarSrc} alt={team.team_name ?? ""} className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="min-w-0 flex-1 whitespace-normal break-words text-lg font-semibold leading-tight sm:text-xl">
              {team.team_name}
            </div>
            <div className="shrink-0 text-lg font-bold tabular-nums text-amber-300 sm:text-xl lg:text-2xl">
              {totalScore}
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
                      <div className="py-1 text-right font-bold tabular-nums text-amber-300">
                        {typeof score === "number" ? score : 0}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="py-1 text-white/70">No rounds</div>
                  <div className="py-1 text-right text-white/70">0</div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Live label removed (per LED UI request) */}
    </div>
  );
}
