import { useMemo } from 'react';
import { format } from 'date-fns';
import { EChart } from '@/components/ui/EChart';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { ATLAXIA_COLORS } from '@/lib/echarts-theme';
import type { EventSensorSeries } from '@/data/eventSeriesMock';

interface EventSensorChartProps {
  series: EventSensorSeries;
  eventStartMs: number;
  eventEndMs: number;
  score: number;
}

/** Color del "esperado por el modelo" — accent-secondary del design system. */
const EXPECTED_COLOR = '#bc8cff';
/** Relleno del residuo (área entre curvas) — critical a baja opacidad. */
const RESIDUAL_FILL = 'rgba(248,81,73,0.12)';

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

  const option = useMemo(() => {
    const pts = series.points;
    const t0 = pts[0]?.ts ?? eventStartMs;
    const tEnd = pts[pts.length - 1]?.ts ?? eventEndMs;
    const rel = (ts: number) => ts - t0;
    const clock = (relMs: number) => format(new Date(t0 + relMs), 'HH:mm:ss');

    const observed = pts.map((p) => [rel(p.ts), p.observed]);
    const expected = pts.map((p) => [rel(p.ts), p.expected]);

    const mutedText = '#8b949e';
    const guide = isDark ? 'rgba(139,148,158,0.16)' : 'rgba(139,148,158,0.22)';
    const cut = isDark ? 'rgba(139,148,158,0.55)' : 'rgba(89,99,110,0.5)';

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
            style: { fill: RESIDUAL_FILL },
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
          color: EXPECTED_COLOR, // color de serie: marcadores de tooltip/axisPointer
          lineStyle: { width: 1.6, color: EXPECTED_COLOR, type: 'dashed' as const },
          emphasis: { disabled: true },
        },
        {
          name: 'observado',
          type: 'line' as const,
          data: observed,
          smooth: true,
          showSymbol: false,
          z: 3,
          color: ATLAXIA_COLORS.primary,
          lineStyle: { width: 2, color: ATLAXIA_COLORS.primary },
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
  }, [series, eventStartMs, eventEndMs, isDark]);

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
