import { useEffect, useRef, type RefObject } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { XaiEngine, type XaiEngineInput } from '@/lib/xai/engine';
import { getEnginePalette } from '@/lib/xai/palette';
import type { XaiDataset, XaiHoverInfo, XaiMode, XaiSettings } from '@/lib/xai/types';

interface UseXaiEngineInput {
  mode: XaiMode;
  frame: number;
  ui: XaiSettings;
  onHover: (info: XaiHoverInfo | null) => void;
}

/**
 * Ciclo de vida del engine de canvas: monta/destruye con el canvas y le
 * propaga frame/modo/controles/tema. El callback de hover y el último input
 * van por ref para que recrear el engine (StrictMode, dataset nuevo) aplique
 * el estado vigente sin esperar al siguiente cambio.
 */
export function useXaiEngine(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  dataset: XaiDataset,
  { mode, frame, ui, onHover }: UseXaiEngineInput
): void {
  const engineRef = useRef<XaiEngine | null>(null);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const { mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const inputRef = useRef<XaiEngineInput>({ mode, frame, ui, palette: getEnginePalette(isDark) });
  inputRef.current = { mode, frame, ui, palette: getEnginePalette(isDark) };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new XaiEngine(canvas, dataset, (info) => onHoverRef.current(info));
    engine.update(inputRef.current);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvasRef, dataset]);

  useEffect(() => {
    engineRef.current?.update({ mode, frame, ui, palette: getEnginePalette(isDark) });
  }, [mode, frame, ui, isDark]);
}
