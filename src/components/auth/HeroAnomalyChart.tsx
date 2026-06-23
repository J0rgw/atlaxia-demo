import { useEffect, useRef } from 'react';

interface HeroAnomalyChartProps {
  className?: string;
}

/**
 * Landing hero animation: opens zoomed into the SWAT sensor telemetry (the
 * variables LIT101, FIT101, AIT201 ... in JetBrains Mono); the AIT202 pH line
 * draws through them with the head dot pinned to its tip; at ~1.3s the observed
 * line splits from the calm prediction and plunges (the anomaly), the residual
 * washing in pink; as the lines rejoin the camera zooms out to reveal the full
 * labelled chart (axes, grid, riesgo 0.99, cut-markers).
 *
 * Clicking the panel replays the whole sequence. lottie-web is loaded lazily so
 * it stays out of the critical bundle, and the animation is fetched from
 * /public so it never bloats the JS chunks.
 */
export function HeroAnomalyChart({ className = '' }: HeroAnomalyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // typed as unknown — lottie-web's AnimationItem isn't imported eagerly
  const animRef = useRef<{ goToAndPlay: (f: number, isFrame?: boolean) => void; destroy: () => void; goToAndStop: (f: number, isFrame?: boolean) => void } | null>(null);

  useEffect(() => {
    let destroyed = false;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    import('lottie-web')
      .then((mod) => {
        if (destroyed || !containerRef.current) return;
        const anim = mod.default.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: !reduced,
          path: `${import.meta.env.BASE_URL}lottie/hero-anomaly.json`,
        });
        animRef.current = anim;
        // With reduced motion, jump straight to the resolved final chart.
        if (reduced) anim.addEventListener('DOMLoaded', () => anim.goToAndStop(209, true));
      })
      .catch(() => {});

    return () => {
      destroyed = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, []);

  const replay = () => animRef.current?.goToAndPlay(0, true);

  return (
    <button
      type="button"
      onClick={replay}
      aria-label="Reproducir la animación: variables convergen en una anomalía"
      className={`group relative block w-full overflow-hidden rounded-lg border border-transparent bg-[var(--bg-base)] transition-colors hover:border-[var(--accent-primary)]/30 ${className}`}
    >
      <div ref={containerRef} className="aspect-[16/9] w-full" />
      <span className="pointer-events-none absolute bottom-2.5 right-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
        click para repetir
      </span>
    </button>
  );
}
