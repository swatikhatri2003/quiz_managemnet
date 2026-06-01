import { Suspense } from "react";

import { ManageClient } from "./manage.client";

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 text-white/70">
          Loading…
        </div>
      }
    >
      <ManageClient />
    </Suspense>
  );
}

