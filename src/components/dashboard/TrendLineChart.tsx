import { useState, type PointerEvent } from "react";
import type { AnnualPoint } from "../../domain/dashboard/calculateDashboardCharts";
import { getChartInk } from "./chartPalette";
import { useTheme } from "../../store/useTheme";
import { formatMoney, formatCompactMoney } from "../../domain/shared/formatMoney";

interface TrendLineChartProps {
  points: AnnualPoint[];
  color: string;
  seriesLabel: string;
}

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 260;
const PLOT_TOP = 16;
const BASELINE = 220;
const PLOT_LEFT = 0;

/** 0 means "no extent needed on this side of zero" — the caller decides what that implies. */
function niceStep(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function TrendLineChart({ points, color, seriesLabel }: TrendLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [theme] = useTheme();
  const chartInk = getChartInk(theme);

  if (points.length === 0) {
    return <p className="chart-empty">Not enough data yet.</p>;
  }

  // Signed-domain scale: zero is always representable, and sits proportionally between the
  // top (positive) and bottom (negative) "nice" extents instead of always at the plot's bottom
  // edge — necessary because a series like net worth isn't reliably non-negative. When every
  // value is >= 0 (loan balance, cumulative interest — every caller today), bottomExtent is 0
  // and this reduces to exactly the old fixed-bottom-baseline behaviour.
  const rawMax = Math.max(...points.map((point) => point.value), 0);
  const rawMin = Math.min(...points.map((point) => point.value), 0);
  const topExtentRaw = niceStep(rawMax);
  const bottomExtent = niceStep(-rawMin);
  // Flat-all-zero fallback (no data on either side): give the top side a sensible scale, matching
  // the old behaviour of treating zero as the floor rather than the middle.
  const topExtent = topExtentRaw > 0 || bottomExtent > 0 ? topExtentRaw : 100;
  const totalExtent = topExtent + bottomExtent;

  const plotHeight = BASELINE - PLOT_TOP;
  const plotWidth = VIEW_WIDTH - PLOT_LEFT;
  const baselineY = PLOT_TOP + (topExtent / totalExtent) * plotHeight;
  const topPlotHeight = baselineY - PLOT_TOP;
  const bottomPlotHeight = BASELINE - baselineY;
  const minYear = points[0].year;
  const maxYear = points[points.length - 1].year;
  const yearSpan = Math.max(maxYear - minYear, 1);

  const xForIndex = (index: number) => PLOT_LEFT + ((points[index].year - minYear) / yearSpan) * plotWidth;
  const yForValue = (value: number) => value >= 0
    ? (topExtent > 0 ? baselineY - (value / topExtent) * topPlotHeight : baselineY)
    : (bottomExtent > 0 ? baselineY + (-value / bottomExtent) * bottomPlotHeight : baselineY);

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${xForIndex(index)},${yForValue(point.value)}`).join(" ");
  const areaPath = `${linePath} L${xForIndex(points.length - 1)},${baselineY} L${xForIndex(0)},${baselineY} Z`;

  const gridSteps = [0.25, 0.5, 0.75, 1];
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
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="trend-chart" role="img" aria-label={seriesLabel}>
        {topExtent > 0 && gridSteps.map((step) => {
          const y = baselineY - topPlotHeight * step;
          return (
            <g key={`top-${step}`}>
              <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={y} y2={y} stroke={chartInk.gridline} strokeWidth="1" />
              <text x={PLOT_LEFT} y={y - 4} fontSize="10" fill={chartInk.muted}>{formatCompactMoney(topExtent * step)}</text>
            </g>
          );
        })}
        {bottomExtent > 0 && gridSteps.map((step) => {
          const y = baselineY + bottomPlotHeight * step;
          return (
            <g key={`bottom-${step}`}>
              <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={y} y2={y} stroke={chartInk.gridline} strokeWidth="1" />
              <text x={PLOT_LEFT} y={y - 4} fontSize="10" fill={chartInk.muted}>{formatCompactMoney(-bottomExtent * step)}</text>
            </g>
          );
        })}
        <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={baselineY} y2={baselineY} stroke={chartInk.baseline} strokeWidth="1" />

        <path d={areaPath} fill={color} opacity="0.1" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {xLabels.map((point) => (
          <text key={point.year} x={xForIndex(points.indexOf(point))} y={BASELINE + 16} fontSize="11" fill={chartInk.secondary} textAnchor="middle">{point.year}</text>
        ))}

        <circle cx={xForIndex(points.length - 1)} cy={yForValue(last.value)} r="5" fill={color} stroke={chartInk.surface} strokeWidth="2" />
        <text x={xForIndex(points.length - 1)} y={yForValue(last.value) - 10} fontSize="11" fontWeight="700" fill={chartInk.primary} textAnchor="end">{formatCompactMoney(last.value)}</text>

        {hovered && (
          <g>
            <line x1={xForIndex(hoverIndex!)} x2={xForIndex(hoverIndex!)} y1={PLOT_TOP} y2={BASELINE} stroke={chartInk.baseline} strokeWidth="1" />
            <circle cx={xForIndex(hoverIndex!)} cy={yForValue(hovered.value)} r="5" fill={color} stroke={chartInk.surface} strokeWidth="2" />
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
      <div className={`chart-tooltip${hovered ? "" : " chart-tooltip--hidden"}`}>
        <strong>{hovered ? formatMoney(hovered.value) : " "}</strong>
        <span>{hovered ? <>{seriesLabel} &middot; {hovered.year}</> : " "}</span>
      </div>
    </div>
  );
}
