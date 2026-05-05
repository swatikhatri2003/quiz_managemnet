"use client";

import { motion } from "framer-motion";

type AppShellProps = {
  title: string;
  imageUrl: string;
  children: React.ReactNode;
  /** Matches scoreboard LED header (thin top bar). */
  variant?: "default" | "scoreboard";
  subtitle?: string;
  right?: React.ReactNode;
};

export function AppShell({
  title,
  imageUrl,
  children,
  variant = "default",
  subtitle,
  right,
}: AppShellProps) {
  const header =
    variant === "scoreboard" ? (
      <header className="mb-4 flex min-h-[72px] flex-col gap-3 border-b border-white/10 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:mb-6 sm:h-[96px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:pb-0 sm:pt-0">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:h-14 sm:w-14">
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight text-white sm:text-2xl">{title}</div>
            {subtitle ? <div className="mt-0.5 text-xs leading-snug text-white/70 sm:mt-1 sm:truncate">{subtitle}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0 text-sm text-white/70">{right}</div> : null}
      </header>
    ) : (
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:mb-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-white/10">
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <div>
            <div className="text-xs text-white">Quiz</div>
            <div className="text-lg font-semibold tracking-tight">{title}</div>
          </div>
        </div>
      </motion.header>
    );

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_50%),radial-gradient(circle_at_bottom,rgba(167,139,250,0.18),transparent_55%)]" />
      </div>

      <div
        className={
          variant === "scoreboard"
            ? "mx-auto w-full max-w-6xl px-0 py-4 sm:py-6"
            : "mx-auto w-full max-w-6xl px-4 py-6 sm:py-8"
        }
      >
        {header}

        <div className={variant === "scoreboard" ? "px-4 sm:px-8" : ""}>{children}</div>
      </div>
    </div>
  );
}

