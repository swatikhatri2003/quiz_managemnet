import { Suspense } from "react";

import { ScoreboardClient } from "./scoreboard.client";

export const metadata = {
  title: "Scoreboard",
  description: "Live scoreboard (Firebase realtime).",
};

export default function ScoreboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-white/70">
          Loading…
        </div>
      }
    >
      <ScoreboardClient />
    </Suspense>
  );
}

