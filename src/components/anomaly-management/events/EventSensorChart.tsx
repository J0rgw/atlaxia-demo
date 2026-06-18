import { useMemo } from 'react';
import { format } from 'date-fns';
import { EChart } from '@/components/ui/EChart';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { useTheme } from '@/providers/ThemeProvider';
import { ATLAXIA_COLORS } from '@/lib/echarts-theme';
import { hexToRgba, readCssVar } from '@/lib/cssVar';
import type { EventSensorSeries } from '@/data/eventSeriesMock';

interface EventSensorChartProps {
  series: EventSensorSeries;
  eventStartMs: number;
  eventEndMs: number;
  score: number;
}

/**
 * Gráfica minimalista del sensor en la ventana del evento (±10%): línea
 * continua sin puntos del OBSERVADO, discontinua del ESPERADO por el modelo,
 * área entre ambas (el residuo = la anomalía) y dos cortes verticales sutiles
 * en el inicio/fin del episodio. Sin cajas ni rejilla: solo 3 guías
 * horizontales tenues.
 *
 * El eje X trabaja en ms RELATIVOS al primer punto (etiquetado como hora de
 * reloj). Nunca uses timestamps absolutos mezclados con datos sintéticos en
 * un eje 'time': cualquier valor espurio (p. ej. un 0) arrastra el dominio
 * a 1970.
 */
export function EventSensorChart({ series, eventStartMs, eventEndMs, score }: EventSensorChartProps) {
  const { theme, isDark } = useEChartsTheme();
  // El canvas de ECharts no resuelve `var()`: leemos los tokens del tema activo
  // (scada/modern × claro/oscuro) en tiempo real. mode/variant son la clave del
  // memo para que el repintado siga al cambio de tema, igual que `isDark`.
  const { mode, variant } = useTheme();

  const option = useMemo(() => {
    // observado = status-advisory; esperado = accent-secondary; residuo = critical.
    const observedColor = readCssVar('--status-advisory', ATLAXIA_COLORS.primary);
    const expectedColor = readCssVar('--accent-secondary', '#bc8cff');
    const residualFill = hexToRgba(readCssVar('--status-critical', '#f85149'), 0.12);

    const pts = series.points;
    const t0 = pts[0]?.ts ?? eventStartMs;
    const tEnd = pts[pts.length - 1]?.ts ?? eventEndMs;
    const rel = (ts: number) => ts - t0;
    const clock = (relMs: number) => format(new Date(t0 + relMs), 'HH:mm:ss');

    const observed = pts.map((p) => [rel(p.ts), p.observed]);
    const expected = pts.map((p) => [rel(p.ts), p.expected]);

    // Cromo del chart desde tokens (igual que las series): el canvas no resuelve
    // `var()`, así que leemos el valor del tema activo. Sin esto los grises
    // quedaban clavados a scada-claro y no seguían a modern ni al modo oscuro
    // (ni al branding por inquilino) — el antipatrón que rompe «Identity propaga».
    const mutedText = readCssVar('--text-muted', '#8b949e');
    const guide = readCssVar('--border-subtle', isDark ? '#21262d' : '#d1d5db');
    const cut = readCssVar('--border-emphasis', isDark ? '#484f58' : '#6b7280');

    return {
      animation: false,
      grid: { left: 46, right: 10, top: 10, bottom: 22 },
      tooltip: {
        trigger: 'axis' as const,
        confine: true, // nunca desbordar el contenedor (charts de 128px)
        axisPointer: { type: 'line' as const, lineStyle: { color: cut, type: 'dashed' as const } },
        formatter: (params: { value: [number, number]; seriesName: string; color: string }[]) => {
          const items = params.filter((p) => Array.isArray(p.value));
          if (!items.length) return '';
          const u = series.unit ? ` ${series.unit}` : '';
          const rows = items
            .map(
              (p) =>
                `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>` +
                `${p.seriesName}: <b>${p.value[1].toFixed(2)}${u}</b>`
            )
            .join('<br/>');
          return `${clock(items[0].value[0])}<br/>${rows}`;
        },
      },
      xAxis: {
        type: 'value' as const,
        min: 0,
        max: rel(tEnd),
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: mutedText,
          fontSize: 9,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (v: number) => clock(v),
          hideOverlap: true,
        },
      },
      yAxis: {
        type: 'value' as const,
        scale: true,
        splitNumber: 3,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: guide, type: 'solid' as const, width: 1 } },
        axisLabel: {
          color: mutedText,
          fontSize: 9,
          fontFamily: 'JetBrains Mono, monospace',
        },
      },
      series: [
        // residuo: polígono entre observado y esperado (la anomalía visible).
        // data = un punto REAL de la serie — un valor fuera de rango (0)
        // arrastraría el dominio de ambos ejes.
        {
          type: 'custom' as const,
          silent: true,
          z: 1,
          clip: true,
          renderItem: (
            _params: unknown,
            api: { coord: (v: [number, number]) => [number, number] }
          ) => ({
            type: 'polygon' as const,
            shape: {
              points: [
                ...observed.map(([x, y]) => api.coord([x, y])),
                ...[...expected].reverse().map(([x, y]) => api.coord([x, y])),
              ],
            },
            style: { fill: residualFill },
            silent: true,
          }),
          data: [observed[0] ?? [0, 0]],
          tooltip: { show: false },
        },
        {
          name: 'esperado',
          type: 'line' as const,
          data: expected,
          smooth: true,
          showSymbol: false,
          z: 2,
          color: expectedColor, // color de serie: marcadores de tooltip/axisPointer
          lineStyle: { width: 1.6, color: expectedColor, type: 'dashed' as const },
          emphasis: { disabled: true },
        },
        {
          name: 'observado',
          type: 'line' as const,
          data: observed,
          smooth: true,
          showSymbol: false,
          z: 3,
          color: observedColor,
          lineStyle: { width: 2, color: observedColor },
          emphasis: { disabled: true },
          // cortes sutiles del episodio: dos verticales discontinuas
          markLine: {
            silent: true,
            symbol: 'none',
            animation: false,
            lineStyle: { type: 'dashed' as const, color: cut, width: 1 },
            label: { show: false },
            data: [{ xAxis: rel(eventStartMs) }, { xAxis: rel(eventEndMs) }],
          },
        },
      ],
    };
    // mode/variant no se referencian en el cuerpo: son claves de caché que
    // fuerzan releer los tokens CSS del tema (lectura del DOM que el linter no ve).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, eventStartMs, eventEndMs, isDark, mode, variant]);

  return (
    <div className="border border-[var(--border-subtle)] rounded-sm bg-[var(--bg-surface)]">
      <div className="flex items-baseline gap-2 px-3 pt-2">
        <span className="font-readout text-xs font-semibold text-[var(--text-primary)]">
          {series.sensor}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] truncate">{series.desc}</span>
        <span className="ml-auto font-readout text-[10px] text-[var(--status-critical)]">
          riesgo {score.toFixed(2)}
        </span>
      </div>
      <div className="h-32">
        <EChart
          option={option}
          theme={theme}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
}
