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
      <header className="relative mb-4 grid min-h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:mb-6 sm:h-[96px] sm:gap-4 sm:px-8 sm:pb-0 sm:pt-0">
        <div />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center justify-center gap-3 sm:gap-4">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:h-14 sm:w-14">
              <img
                src={imageUrl}
                alt={title}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <div className="min-w-0 text-center">
              <div className="truncate text-lg font-semibold tracking-tight text-white sm:text-2xl">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-0.5 text-xs leading-snug text-white/70 sm:mt-1 sm:truncate">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          {right ? <div className="shrink-0 text-sm text-white/70">{right}</div> : null}
        </div>
      </header>
    ) : (
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur sm:mb-6"
      >
        <div />
        <div className="flex items-center justify-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-white/10">
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" loading="eager" />
          </div>
          <div className="min-w-0 text-center">
            <div className="text-xs text-white">Quiz</div>
            <div className="truncate text-lg font-semibold tracking-tight">{title}</div>
          </div>
        </div>
        <div />
      </motion.header>
    );

  return (
    <div className="min-h-screen bg-zinc-950">
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

