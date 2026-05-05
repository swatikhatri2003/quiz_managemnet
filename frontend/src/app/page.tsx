import { Suspense } from "react";

import { PointsEntryClient } from "./points-entry.client";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-white/70">
          Loading…
        </div>
      }
    >
      <PointsEntryClient />
    </Suspense>
  );
}
