export function AnimatedBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Deep base */}
      <div className="absolute inset-0 bg-zinc-950" />

      {/* Soft glow */}
      <div className="animated-glow absolute inset-0 opacity-70" />

      {/* Stars layer */}
      <div className="animated-stars absolute -inset-[20%] opacity-60" />

      {/* Floating balloons layer (subtle, slow) */}
      <div className="animated-balloons absolute -inset-[20%] opacity-50" />

      {/* Vignette for contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.65)_85%)]" />
    </div>
  );
}

