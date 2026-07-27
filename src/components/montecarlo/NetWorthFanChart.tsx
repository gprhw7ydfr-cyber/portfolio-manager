import { useState, type PointerEvent } from "react";
import type { NetWorthPercentiles } from "../../domain/montecarlo/runMonteCarloSimulation";
import { CHART_INK, CATEGORICAL } from "../dashboard/chartPalette";
import { formatMoney, formatCompactMoney } from "../../domain/shared/formatMoney";

interface NetWorthFanChartProps {
  points: NetWorthPercentiles[];
}

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 280;
const PLOT_TOP = 16;
const PLOT_BOTTOM = 220;
const PLOT_LEFT = 0;
const COLOR = CATEGORICAL.blue;

function niceStep(range: number): number {
  if (range <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(range));
  const normalized = range / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return (step * magnitude) / 4;
}

/** P10–P90 band is one entity's uncertainty range, not three identities — a single hue at two
 *  weights (light fill for the band, solid line for the median), not three categorical colors. */
export function NetWorthFanChart({ points }: NetWorthFanChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="chart-empty">Not enough data yet.</p>;
  }

  const allValues = points.flatMap((point) => [point.p10, point.median, point.p90]);
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);
  const step = niceStep(maxValue - minValue) || 1;
  const niceMaxValue = Math.ceil(maxValue / step) * step;
  const niceMinValue = Math.floor(minValue / step) * step;
  const range = niceMaxValue - niceMinValue || 1;

  const plotHeight = PLOT_BOTTOM - PLOT_TOP;
  const plotWidth = VIEW_WIDTH - PLOT_LEFT;
  const minYear = points[0].year;
  const maxYear = points[points.length - 1].year;
  const yearSpan = Math.max(maxYear - minYear, 1);

  const xForIndex = (index: number) => PLOT_LEFT + ((points[index].year - minYear) / yearSpan) * plotWidth;
  const yForValue = (value: number) => PLOT_TOP + ((niceMaxValue - value) / range) * plotHeight;

  const bandPath = [
    ...points.map((point, index) => `${index === 0 ? "M" : "L"}${xForIndex(index)},${yForValue(point.p90)}`),
    ...[...points].reverse().map((point) => `L${xForIndex(points.indexOf(point))},${yForValue(point.p10)}`),
    "Z",
  ].join(" ");
  const medianPath = points.map((point, index) => `${index === 0 ? "M" : "L"}${xForIndex(index)},${yForValue(point.median)}`).join(" ");

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const yearStep = Math.max(Math.ceil(points.length / 6), 1);
  const xLabels = points.filter((_, index) => index % yearStep === 0 || index === points.length - 1);

  const handlePointerMove = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(Math.min(Math.max(index, 0), points.length - 1));
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined;
  const last = points[points.length - 1];

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="trend-chart" role="img" aria-label="Net worth range">
        {gridSteps.map((step) => {
          const value = niceMinValue + range * step;
          const y = yForValue(value);
          return (
            <g key={step}>
              <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={y} y2={y} stroke={value === 0 ? CHART_INK.baseline : CHART_INK.gridline} strokeWidth="1" />
              <text x={PLOT_LEFT} y={y - 4} fontSize="10" fill={CHART_INK.muted}>{formatCompactMoney(value)}</text>
            </g>
          );
        })}

        <path d={bandPath} fill={COLOR} opacity="0.14" stroke="none" />
        <path d={medianPath} fill="none" stroke={COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {xLabels.map((point) => (
          <text key={point.year} x={xForIndex(points.indexOf(point))} y={PLOT_BOTTOM + 16} fontSize="11" fill={CHART_INK.secondary} textAnchor="middle">{point.year}</text>
        ))}

        <circle cx={xForIndex(points.length - 1)} cy={yForValue(last.median)} r="5" fill={COLOR} stroke={CHART_INK.surface} strokeWidth="2" />
        <text x={xForIndex(points.length - 1)} y={yForValue(last.median) - 10} fontSize="11" fontWeight="700" fill={CHART_INK.primary} textAnchor="end">{formatCompactMoney(last.median)}</text>

        {hovered && (
          <g>
            <line x1={xForIndex(hoverIndex!)} x2={xForIndex(hoverIndex!)} y1={PLOT_TOP} y2={PLOT_BOTTOM} stroke={CHART_INK.baseline} strokeWidth="1" />
            <circle cx={xForIndex(hoverIndex!)} cy={yForValue(hovered.median)} r="5" fill={COLOR} stroke={CHART_INK.surface} strokeWidth="2" />
          </g>
        )}

        <rect
          x={PLOT_LEFT}
          y={PLOT_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      <ul className="chart-legend">
        <li><span className="chart-legend__swatch" style={{ background: COLOR }} /><span className="chart-legend__label">Median</span></li>
        <li><span className="chart-legend__swatch" style={{ background: COLOR, opacity: 0.3 }} /><span className="chart-legend__label">10th–90th percentile range</span></li>
      </ul>

      {hovered && (
        <div className="chart-tooltip">
          <strong>{formatMoney(hovered.median)} median</strong>
          <span>{formatMoney(hovered.p10)} – {formatMoney(hovered.p90)} &middot; {hovered.year}</span>
        </div>
      )}
    </div>
  );
}
