import { Pause, Play } from 'lucide-react';
import type { XaiMode } from '@/lib/xai/types';

interface XaiTimelineProps {
  mode: XaiMode;
  frame: number;
  nFrames: number;
  nodeCount: number;
  playing: boolean;
  onFrameChange: (frame: number) => void;
  onTogglePlay: () => void;
}

/** Scrubber temporal del evento + reproducción (footer del lienzo). */
export function XaiTimeline({
  mode,
  frame,
  nFrames,
  nodeCount,
  playing,
  onFrameChange,
  onTogglePlay,
}: XaiTimelineProps) {
  const label =
    mode === 'frame'
      ? `frame ${frame}/${nFrames - 1} · ${nodeCount} nodos`
      : `acumulado 0–${frame} · ${nodeCount} nodos`;

  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)]">
      <button
        type="button"
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        onClick={onTogglePlay}
        className="w-8 h-8 pointer-coarse:h-11 pointer-coarse:w-11 rounded-sm bg-[var(--accent-primary)] text-white flex items-center justify-center shrink-0 transition-transform hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={nFrames - 1}
        value={frame}
        aria-label="Línea temporal del evento"
        onChange={(e) => onFrameChange(Number(e.target.value))}
        className="flex-1 h-1 cursor-pointer [accent-color:var(--status-critical)]"
      />
      <span className="font-readout text-[11.5px] text-[var(--text-secondary)] min-w-[200px] text-right">
        {label}
      </span>
    </div>
  );
}
