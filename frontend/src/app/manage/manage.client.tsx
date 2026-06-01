"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { apiGet, apiPost, apiPostForm } from "@/lib/api";
import type { Quiz, Round, Team } from "@/lib/types";

type ModalKind =
  | { type: "quiz_add" }
  | { type: "quiz_edit"; quiz: Quiz }
  | { type: "team_add"; quiz: Quiz }
  | { type: "team_edit"; quiz: Quiz; team: Team }
  | { type: "round_add"; quiz: Quiz }
  | { type: "round_edit"; quiz: Quiz; round: Round }
  | null;

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0 truncate text-base font-semibold text-white">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="pt-3">{children}</div>
      </div>
    </div>
  );
}

function ImgPreview({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return null;
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-40 w-full object-cover" />
    </div>
  );
}

export function ManageClient() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const selectedQuiz = useMemo(
    () => quizzes.find((q) => q.quiz_id === selectedQuizId) || null,
    [quizzes, selectedQuizId]
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);

  async function loadQuizzes() {
    const res = await apiPost<Quiz[]>("/quiz/get", {});
    if (!res.ok) return toast.error(res.error.message);
    setQuizzes(res.data);
    setSelectedQuizId((prev) => prev ?? res.data[0]?.quiz_id ?? null);
  }

  async function loadTeams(quiz_id: number) {
    const res = await apiPost<Team[]>("/teams/get", { quiz_id });
    if (res.ok) return setTeams(res.data);

    // Backward-compatible fallback for older API that doesn't have POST /teams/get.
    const fallback = await apiGet<Team[]>("/teams/");
    if (!fallback.ok) return toast.error(res.error.message);
    setTeams((fallback.data || []).filter((t) => t.quiz_id === quiz_id));
  }

  async function loadRounds(quiz_id: number) {
    const res = await apiPost<Round[]>("/rounds/get", { quiz_id });
    if (!res.ok) return toast.error(res.error.message);
    setRounds(res.data);
  }

  async function refreshSelected() {
    await loadQuizzes();
    if (selectedQuizId) {
      await Promise.all([loadTeams(selectedQuizId), loadRounds(selectedQuizId)]);
    }
  }

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (!selectedQuizId) {
      setTeams([]);
      setRounds([]);
      return;
    }
    loadTeams(selectedQuizId);
    loadRounds(selectedQuizId);
  }, [selectedQuizId]);

  async function quizCreate({ name, file }: { name: string; file: File | null }) {
    const form = new FormData();
    form.set("name", name);
    if (file) form.set("image", file);
    const res = await apiPostForm<Quiz>("/quiz/create", form);
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Created");
    setModal(null);
    await loadQuizzes();
  }

  async function quizUpdate({
    quiz_id,
    name,
    file,
  }: {
    quiz_id: number;
    name: string;
    file: File | null;
  }) {
    const form = new FormData();
    form.set("quiz_id", String(quiz_id));
    form.set("name", name);
    if (file) form.set("image", file);
    const res = await apiPostForm<Quiz>("/quiz/update", form);
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Updated");
    setModal(null);
    await loadQuizzes();
  }

  async function quizDelete(quiz_id: number) {
    const ok = window.confirm("Delete this quiz? Teams/Rounds/Points linked may fail if DB has constraints.");
    if (!ok) return;
    const res = await apiPost<{ quiz_id: number }>("/quiz/delete", { quiz_id });
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Deleted");
    setSelectedQuizId(null);
    await refreshSelected();
  }

  async function teamCreate({
    quiz_id,
    team_name,
    file,
  }: {
    quiz_id: number;
    team_name: string;
    file: File | null;
  }) {
    const form = new FormData();
    form.set("quiz_id", String(quiz_id));
    form.set("team_name", team_name);
    if (file) form.set("image", file);
    const res = await apiPostForm<Team>("/teams/create", form);
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Created");
    setModal(null);
    await loadTeams(quiz_id);
  }

  async function teamUpdate({
    team_id,
    quiz_id,
    team_name,
    file,
  }: {
    team_id: number;
    quiz_id: number;
    team_name: string;
    file: File | null;
  }) {
    const form = new FormData();
    form.set("team_id", String(team_id));
    form.set("quiz_id", String(quiz_id));
    form.set("team_name", team_name);
    if (file) form.set("image", file);
    const res = await apiPostForm<Team>("/teams/update", form);
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Updated");
    setModal(null);
    await loadTeams(quiz_id);
  }

  async function teamDelete(team_id: number, quiz_id: number) {
    const ok = window.confirm("Delete this team?");
    if (!ok) return;
    const res = await apiPost<{ team_id: number }>("/teams/delete", { team_id });
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Deleted");
    await loadTeams(quiz_id);
  }

  async function roundCreate({
    quiz_id,
    round_name,
    file,
  }: {
    quiz_id: number;
    round_name: string;
    file: File | null;
  }) {
    const form = new FormData();
    form.set("quiz_id", String(quiz_id));
    form.set("round_name", round_name);
    if (file) form.set("image", file);
    const res = await apiPostForm<Round>("/rounds/create", form);
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Created");
    setModal(null);
    await loadRounds(quiz_id);
  }

  async function roundUpdate({
    round_id,
    quiz_id,
    round_name,
    file,
  }: {
    round_id: number;
    quiz_id: number;
    round_name: string;
    file: File | null;
  }) {
    const form = new FormData();
    form.set("round_id", String(round_id));
    form.set("quiz_id", String(quiz_id));
    form.set("round_name", round_name);
    if (file) form.set("image", file);
    const res = await apiPostForm<Round>("/rounds/update", form);
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Updated");
    setModal(null);
    await loadRounds(quiz_id);
  }

  async function roundDelete(round_id: number, quiz_id: number) {
    const ok = window.confirm("Delete this round?");
    if (!ok) return;
    const res = await apiPost<{ round_id: number }>("/rounds/delete", { round_id });
    if (!res.ok) return toast.error(res.error.message);
    toast.success(res.message || "Deleted");
    await loadRounds(quiz_id);
  }

  return (
    <AppShell
      title="Manage"
      variant="scoreboard"
      subtitle="Quizzes • Teams • Rounds"
      right={
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Back
        </Link>
      }
    >
      <Toaster
        position="top-center"
        containerClassName="!top-[max(0.5rem,env(safe-area-inset-top))] sm:!top-4"
        toastOptions={{ style: { maxWidth: "min(100vw - 2rem, 360px)" } }}
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <Card
          title="Quizzes"
          right={
            <button
              type="button"
              onClick={() => setModal({ type: "quiz_add" })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400 text-zinc-950 hover:bg-sky-300"
              aria-label="Add quiz"
              title="Add quiz"
            >
              <IconPlus />
            </button>
          }
        >
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-white">Select quiz</span>
              <select
                value={selectedQuizId ?? ""}
                onChange={(e) => setSelectedQuizId(Number(e.target.value))}
                className="h-12 min-h-11 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-base text-zinc-50 outline-none focus:border-sky-400/50 sm:h-11 sm:text-sm"
              >
                {quizzes.map((q) => (
                  <option key={q.quiz_id} value={q.quiz_id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2">
              {quizzes.map((q) => (
                <div
                  key={q.quiz_id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {q.image_url ? (
                        <img src={q.image_url} alt={q.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                          {q.name?.trim()?.[0]?.toUpperCase() ?? "Q"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{q.name}</div>
                      <div className="text-xs text-white/70">ID: {q.quiz_id}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModal({ type: "quiz_edit", quiz: q })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      aria-label="Edit quiz"
                      title="Edit quiz"
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => void quizDelete(q.quiz_id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      aria-label="Delete quiz"
                      title="Delete quiz"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Teams"
          right={
            selectedQuiz ? (
              <button
                type="button"
                onClick={() => setModal({ type: "team_add", quiz: selectedQuiz })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-950 hover:bg-zinc-200"
                aria-label="Add team"
                title="Add team"
              >
                <IconPlus />
              </button>
            ) : null
          }
        >
          {!selectedQuiz ? (
            <div className="text-sm text-white/70">Select a quiz first.</div>
          ) : (
            <div className="grid gap-2">
              {teams.map((t) => (
                <div
                  key={t.team_id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {t.image_url ? (
                        <img src={t.image_url} alt={t.team_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                          {t.team_name?.trim()?.[0]?.toUpperCase() ?? "T"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{t.team_name}</div>
                      <div className="text-xs text-white/70">ID: {t.team_id}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModal({ type: "team_edit", quiz: selectedQuiz, team: t })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      aria-label="Edit team"
                      title="Edit team"
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => void teamDelete(t.team_id, selectedQuiz.quiz_id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      aria-label="Delete team"
                      title="Delete team"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
              {teams.length === 0 ? <div className="text-sm text-white/70">No teams.</div> : null}
            </div>
          )}
        </Card>

        <Card
          title="Rounds"
          right={
            selectedQuiz ? (
              <button
                type="button"
                onClick={() => setModal({ type: "round_add", quiz: selectedQuiz })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-950 hover:bg-zinc-200"
                aria-label="Add round"
                title="Add round"
              >
                <IconPlus />
              </button>
            ) : null
          }
        >
          {!selectedQuiz ? (
            <div className="text-sm text-white/70">Select a quiz first.</div>
          ) : (
            <div className="grid gap-2">
              {rounds.map((r) => (
                <div
                  key={r.round_id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{r.round_name}</div>
                    <div className="text-xs text-white/70">ID: {r.round_id}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModal({ type: "round_edit", quiz: selectedQuiz, round: r })}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      aria-label="Edit round"
                      title="Edit round"
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => void roundDelete(r.round_id, selectedQuiz.quiz_id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      aria-label="Delete round"
                      title="Delete round"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
              {rounds.length === 0 ? <div className="text-sm text-white/70">No rounds.</div> : null}
            </div>
          )}
        </Card>
      </div>

      {modal?.type === "quiz_add" ? (
        <QuizModal
          title="Add Quiz"
          initialName=""
          initialImageUrl={null}
          requireImage={true}
          onClose={() => setModal(null)}
          onSubmit={(v) => void quizCreate(v)}
        />
      ) : null}

      {modal?.type === "quiz_edit" ? (
        <QuizModal
          title="Edit Quiz"
          initialName={modal.quiz.name}
          initialImageUrl={modal.quiz.image_url}
          requireImage={false}
          onClose={() => setModal(null)}
          onSubmit={(v) => void quizUpdate({ quiz_id: modal.quiz.quiz_id, ...v })}
        />
      ) : null}

      {modal?.type === "team_add" ? (
        <TeamModal
          title={`Add Team • ${modal.quiz.name}`}
          initialName=""
          initialImageUrl={null}
          onClose={() => setModal(null)}
          onSubmit={(v) => void teamCreate({ quiz_id: modal.quiz.quiz_id, ...v })}
        />
      ) : null}

      {modal?.type === "team_edit" ? (
        <TeamModal
          title={`Edit Team • ${modal.quiz.name}`}
          initialName={modal.team.team_name}
          initialImageUrl={modal.team.image_url}
          onClose={() => setModal(null)}
          onSubmit={(v) =>
            void teamUpdate({ team_id: modal.team.team_id, quiz_id: modal.quiz.quiz_id, ...v })
          }
        />
      ) : null}

      {modal?.type === "round_add" ? (
        <RoundModal
          title={`Add Round • ${modal.quiz.name}`}
          initialName=""
          onClose={() => setModal(null)}
          onSubmit={(v) => void roundCreate({ quiz_id: modal.quiz.quiz_id, ...v })}
        />
      ) : null}

      {modal?.type === "round_edit" ? (
        <RoundModal
          title={`Edit Round • ${modal.quiz.name}`}
          initialName={modal.round.round_name}
          onClose={() => setModal(null)}
          onSubmit={(v) =>
            void roundUpdate({ round_id: modal.round.round_id, quiz_id: modal.quiz.quiz_id, ...v })
          }
        />
      ) : null}
    </AppShell>
  );
}

function IconPlus() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.83l-1.17-1.17a2 2 0 0 0-2.83 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 7h12M10 7V5h4v2m-7 0 1 14h8l1-14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuizModal({
  title,
  initialName,
  initialImageUrl,
  requireImage,
  onClose,
  onSubmit,
}: {
  title: string;
  initialName: string;
  initialImageUrl: string | null;
  requireImage: boolean;
  onClose: () => void;
  onSubmit: (v: { name: string; file: File | null }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-white">Quiz name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-base text-zinc-50 outline-none focus:border-sky-400/50 sm:h-11 sm:text-sm"
            placeholder="Enter quiz name"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-white">{requireImage ? "Quiz image *" : "Quiz image (optional)"}</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
          />
          <ImgPreview src={preview || initialImageUrl} alt="Preview" />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              const n = name.trim();
              if (!n) return toast.error("Name is required.");
              if (requireImage && !file) return toast.error("Image is required.");
              onSubmit({ name: n, file });
            }}
            className="h-12 flex-1 rounded-xl bg-sky-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-sky-300 sm:h-11"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 sm:h-11"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TeamModal({
  title,
  initialName,
  initialImageUrl,
  onClose,
  onSubmit,
}: {
  title: string;
  initialName: string;
  initialImageUrl: string | null;
  onClose: () => void;
  onSubmit: (v: { team_name: string; file: File | null }) => void;
}) {
  const [team_name, setTeamName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-white">Team name *</span>
          <input
            value={team_name}
            onChange={(e) => setTeamName(e.target.value)}
            className="h-12 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-base text-zinc-50 outline-none focus:border-sky-400/50 sm:h-11 sm:text-sm"
            placeholder="Enter team name"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-white">Team image (optional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
          />
          <ImgPreview src={preview || initialImageUrl} alt="Preview" />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              const n = team_name.trim();
              if (!n) return toast.error("Name is required.");
              onSubmit({ team_name: n, file });
            }}
            className="h-12 flex-1 rounded-xl bg-sky-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-sky-300 sm:h-11"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 sm:h-11"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RoundModal({
  title,
  initialName,
  onClose,
  onSubmit,
}: {
  title: string;
  initialName: string;
  onClose: () => void;
  onSubmit: (v: { round_name: string; file: File | null }) => void;
}) {
  const [round_name, setRoundName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-white">Round name *</span>
          <input
            value={round_name}
            onChange={(e) => setRoundName(e.target.value)}
            className="h-12 rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-base text-zinc-50 outline-none focus:border-sky-400/50 sm:h-11 sm:text-sm"
            placeholder="Enter round name"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-white">Round image (optional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
          />
          <ImgPreview src={preview} alt="Preview" />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              const n = round_name.trim();
              if (!n) return toast.error("Name is required.");
              onSubmit({ round_name: n, file });
            }}
            className="h-12 flex-1 rounded-xl bg-sky-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-sky-300 sm:h-11"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 sm:h-11"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

