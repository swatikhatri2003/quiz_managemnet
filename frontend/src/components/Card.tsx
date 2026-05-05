"use client";

import { motion } from "framer-motion";

export function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur sm:p-4"
    >
      <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 className="min-w-0 text-sm font-semibold leading-snug text-zinc-100">{title}</h2>
        {right ? <div className="w-full shrink-0 sm:w-auto">{right}</div> : null}
      </div>
      {children}
    </motion.section>
  );
}

