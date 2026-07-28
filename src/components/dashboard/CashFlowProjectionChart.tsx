import type { AnnualPoint } from "../../domain/dashboard/calculateDashboardCharts";
import { getChartInk } from "./chartPalette";
import { useTheme } from "../../store/useTheme";
import { formatMoney, formatCompactMoney } from "../../domain/shared/formatMoney";

interface CashFlowProjectionChartProps {
  points: AnnualPoint[];
  color: string;
  seriesLabel: string;
}

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 260;
const PLOT_TOP = 24;
const BASELINE = 220;
const BAR_MAX_WIDTH = 24;

/** 0 means "no extent needed on this side of zero" — the caller decides what that implies. */
function niceStep(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function CashFlowProjectionChart({ points, color, seriesLabel }: CashFlowProjectionChartProps) {
  const [theme] = useTheme();
  const chartInk = getChartInk(theme);

  if (points.length === 0) {
    return <p className="chart-empty">Not enough data yet.</p>;
  }

  // Cash flow can be negative (a heavily-leveraged portfolio's early projected years commonly
  // are), so bars grow both up and down from a zero baseline — not always pinned to the bottom
  // the way PropertyValuesChart's always-positive bars are. Whenever there's a negative extent,
  // the baseline sits at the exact vertical midpoint (not weighted by relative magnitude) so
  // negative values always get a full, legible half of the chart rather than being squeezed into
  // a thin sliver when the positive side happens to be much larger.
  const rawMax = Math.max(...points.map((point) => point.value), 0);
  const rawMin = Math.min(...points.map((point) => point.value), 0);
  const topExtentRaw = niceStep(rawMax);
  const bottomExtent = niceStep(-rawMin);
  const topExtent = topExtentRaw > 0 || bottomExtent > 0 ? topExtentRaw : 100;

  const plotHeight = BASELINE - PLOT_TOP;
  const baselineY = bottomExtent > 0 ? PLOT_TOP + plotHeight / 2 : BASELINE;
  const topPlotHeight = baselineY - PLOT_TOP;
  const bottomPlotHeight = BASELINE - baselineY;

  const bandWidth = VIEW_WIDTH / points.length;
  const barWidth = Math.min(BAR_MAX_WIDTH, bandWidth * 0.5);
  const gridSteps = [0.25, 0.5, 0.75, 1];

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="bar-chart" role="img" aria-label={seriesLabel}>
        {topExtent > 0 && gridSteps.map((step) => {
          const y = baselineY - topPlotHeight * step;
          return (
            <g key={`top-${step}`}>
              <line x1="0" x2={VIEW_WIDTH} y1={y} y2={y} stroke={chartInk.gridline} strokeWidth="1" />
              <text x="0" y={y - 4} fontSize="10" fill={chartInk.muted}>{formatCompactMoney(topExtent * step)}</text>
            </g>
          );
        })}
        {bottomExtent > 0 && gridSteps.map((step) => {
          const y = baselineY + bottomPlotHeight * step;
          return (
            <g key={`bottom-${step}`}>
              <line x1="0" x2={VIEW_WIDTH} y1={y} y2={y} stroke={chartInk.gridline} strokeWidth="1" />
              <text x="0" y={y - 4} fontSize="10" fill={chartInk.muted}>{formatCompactMoney(-bottomExtent * step)}</text>
            </g>
          );
        })}
        <line x1="0" x2={VIEW_WIDTH} y1={baselineY} y2={baselineY} stroke={chartInk.baseline} strokeWidth="1" />
        {points.map((point, index) => {
          const isPositive = point.value >= 0;
          const barHeight = isPositive
            ? (topExtent > 0 ? Math.max((point.value / topExtent) * topPlotHeight, 0) : 0)
            : (bottomExtent > 0 ? Math.max((-point.value / bottomExtent) * bottomPlotHeight, 0) : 0);
          const x = index * bandWidth + (bandWidth - barWidth) / 2;
          const y = isPositive ? baselineY - barHeight : baselineY;
          const labelY = isPositive ? y - 6 : y + barHeight + 14;
          return (
            <g key={point.year} className="bar-chart__bar">
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx="4" fill={color}>
                <title>{`${point.year}: ${formatMoney(point.value)}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={labelY} fontSize="11" fill={chartInk.secondary} textAnchor="middle">{formatCompactMoney(point.value)}</text>
              <text x={x + barWidth / 2} y={BASELINE + 16} fontSize="11" fill={chartInk.secondary} textAnchor="middle">{point.year}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
