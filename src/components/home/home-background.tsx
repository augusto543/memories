/**
 * Background emocional da Home — três orbs radiais com glow + ruído sutil.
 * Server component, sem JS, custo zero de bundle.
 */
export function HomeBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Orb 1 — primary glow no topo */}
      <div className="absolute -top-40 left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px] animate-glow-pulse" />
      {/* Orb 2 — nostalgia warm direita */}
      <div
        className="absolute right-[-10%] top-[20%] h-[40vh] w-[40vw] rounded-full bg-mood-nostalgia/15 blur-[100px] animate-glow-pulse"
        style={{ animationDelay: "1.5s" }}
      />
      {/* Orb 3 — longing lilac esquerda baixo */}
      <div
        className="absolute bottom-[-10%] left-[-5%] h-[40vh] w-[40vw] rounded-full bg-mood-longing/15 blur-[100px] animate-glow-pulse"
        style={{ animationDelay: "3s" }}
      />
      {/* Ruído sutil pra textura cinemática */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay" />
    </div>
  );
}
