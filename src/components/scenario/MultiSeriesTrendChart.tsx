import { useState, type PointerEvent } from "react";
import type { AnnualPoint } from "../../domain/dashboard/calculateDashboardCharts";
import { getChartInk } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";
import { formatMoney, formatCompactMoney } from "../../domain/shared/formatMoney";

export interface TrendSeries {
  label: string;
  color: string;
  points: AnnualPoint[];
}

interface MultiSeriesTrendChartProps {
  series: TrendSeries[];
  seriesLabel: string;
  /** Defaults to money formatting — pass percent/multiplier formatters to plot non-money series
   *  (e.g. yield, ROI) without changing any existing money-formatted caller. */
  formatValue?: (value: number) => string;
  formatCompactValue?: (value: number) => string;
}

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 280;
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

function valueAtYear(points: AnnualPoint[], year: number): number | undefined {
  return points.find((point) => point.year === year)?.value;
}

export function MultiSeriesTrendChart({ series, seriesLabel, formatValue = formatMoney, formatCompactValue = formatCompactMoney }: MultiSeriesTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [theme] = useTheme();
  const chartInk = getChartInk(theme);

  const nonEmpty = series.filter((item) => item.points.length > 0);
  if (nonEmpty.length === 0) {
    return <p className="chart-empty">Not enough data yet.</p>;
  }

  const years = [...new Set(nonEmpty.flatMap((item) => item.points.map((point) => point.year)))].sort((a, b) => a - b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const yearSpan = Math.max(maxYear - minYear, 1);

  // Signed-domain scale: zero is always representable, and sits proportionally between the top
  // (positive) and bottom (negative) "nice" extents instead of always at the plot's bottom edge —
  // necessary since a compared series (net worth, ROI, yield...) isn't reliably non-negative. When
  // every value is >= 0, bottomExtent is 0 and this reduces to the old fixed-bottom-baseline look.
  const allValues = nonEmpty.flatMap((item) => item.points.map((point) => point.value));
  const rawMax = Math.max(...allValues, 0);
  const rawMin = Math.min(...allValues, 0);
  const topExtentRaw = niceStep(rawMax);
  const bottomExtent = niceStep(-rawMin);
  const topExtent = topExtentRaw > 0 || bottomExtent > 0 ? topExtentRaw : 100;
  const totalExtent = topExtent + bottomExtent;

  const plotHeight = BASELINE - PLOT_TOP;
  const plotWidth = VIEW_WIDTH - PLOT_LEFT;
  const baselineY = PLOT_TOP + (topExtent / totalExtent) * plotHeight;
  const topPlotHeight = baselineY - PLOT_TOP;
  const bottomPlotHeight = BASELINE - baselineY;

  const xForYear = (year: number) => PLOT_LEFT + ((year - minYear) / yearSpan) * plotWidth;
  const yForValue = (value: number) => value >= 0
    ? (topExtent > 0 ? baselineY - (value / topExtent) * topPlotHeight : baselineY)
    : (bottomExtent > 0 ? baselineY + (-value / bottomExtent) * bottomPlotHeight : baselineY);

  const gridSteps = [0.25, 0.5, 0.75, 1];
  const yearStep = Math.max(Math.ceil(years.length / 6), 1);
  const xLabels = years.filter((_, index) => index % yearStep === 0 || index === years.length - 1);

  const handlePointerMove = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (years.length - 1));
    setHoverIndex(Math.min(Math.max(index, 0), years.length - 1));
  };

  const hoveredYear = hoverIndex !== null ? years[hoverIndex] : undefined;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="trend-chart" role="img" aria-label={seriesLabel}>
        {topExtent > 0 && gridSteps.map((step) => {
          const y = baselineY - topPlotHeight * step;
          return (
            <g key={`top-${step}`}>
              <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={y} y2={y} stroke={chartInk.gridline} strokeWidth="1" />
              <text x={PLOT_LEFT} y={y - 4} fontSize="10" fill={chartInk.muted}>{formatCompactValue(topExtent * step)}</text>
            </g>
          );
        })}
        {bottomExtent > 0 && gridSteps.map((step) => {
          const y = baselineY + bottomPlotHeight * step;
          return (
            <g key={`bottom-${step}`}>
              <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={y} y2={y} stroke={chartInk.gridline} strokeWidth="1" />
              <text x={PLOT_LEFT} y={y - 4} fontSize="10" fill={chartInk.muted}>{formatCompactValue(-bottomExtent * step)}</text>
            </g>
          );
        })}
        <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={baselineY} y2={baselineY} stroke={chartInk.baseline} strokeWidth="1" />

        {nonEmpty.map((item) => {
          const linePath = item.points.map((point, index) => `${index === 0 ? "M" : "L"}${xForYear(point.year)},${yForValue(point.value)}`).join(" ");
          const last = item.points[item.points.length - 1];
          return (
            <g key={item.label}>
              <path d={linePath} fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={xForYear(last.year)} cy={yForValue(last.value)} r="5" fill={item.color} stroke={chartInk.surface} strokeWidth="2" />
              <text x={xForYear(last.year)} y={yForValue(last.value) - 10} fontSize="11" fontWeight="700" fill={chartInk.primary} textAnchor="end">{formatCompactValue(last.value)}</text>
            </g>
          );
        })}

        {xLabels.map((year) => (
          <text key={year} x={xForYear(year)} y={BASELINE + 16} fontSize="11" fill={chartInk.secondary} textAnchor="middle">{year}</text>
        ))}

        {hoveredYear !== undefined && (
          <line x1={xForYear(hoveredYear)} x2={xForYear(hoveredYear)} y1={PLOT_TOP} y2={BASELINE} stroke={chartInk.baseline} strokeWidth="1" />
        )}
        {hoveredYear !== undefined && nonEmpty.map((item) => {
          const value = valueAtYear(item.points, hoveredYear);
          if (value === undefined) return null;
          return <circle key={item.label} cx={xForYear(hoveredYear)} cy={yForValue(value)} r="5" fill={item.color} stroke={chartInk.surface} strokeWidth="2" />;
        })}

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
        {nonEmpty.map((item) => (
          <li key={item.label}>
            <span className="chart-legend__swatch" style={{ background: item.color }} />
            <span className="chart-legend__label">{item.label}</span>
          </li>
        ))}
      </ul>

      <div className={`chart-tooltip${hoveredYear !== undefined ? "" : " chart-tooltip--hidden"}`}>
        {nonEmpty.map((item) => {
          const value = hoveredYear !== undefined ? valueAtYear(item.points, hoveredYear) : undefined;
          return (
            <strong key={item.label}>{item.label}: {value !== undefined ? formatValue(value) : " "}</strong>
          );
        })}
        <span>{hoveredYear ?? " "}</span>
      </div>
    </div>
  );
}
