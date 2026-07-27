import { useState, type PointerEvent } from "react";
import type { AnnualPoint } from "../../domain/dashboard/calculateDashboardCharts";
import { CHART_INK } from "../dashboard/chartPalette";
import { formatMoney, formatCompactMoney } from "../../domain/shared/formatMoney";

export interface TrendSeries {
  label: string;
  color: string;
  points: AnnualPoint[];
}

interface MultiSeriesTrendChartProps {
  series: TrendSeries[];
  seriesLabel: string;
}

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 280;
const PLOT_TOP = 16;
const BASELINE = 220;
const PLOT_LEFT = 0;

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function valueAtYear(points: AnnualPoint[], year: number): number | undefined {
  return points.find((point) => point.year === year)?.value;
}

export function MultiSeriesTrendChart({ series, seriesLabel }: MultiSeriesTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const nonEmpty = series.filter((item) => item.points.length > 0);
  if (nonEmpty.length === 0) {
    return <p className="chart-empty">Not enough data yet.</p>;
  }

  const years = [...new Set(nonEmpty.flatMap((item) => item.points.map((point) => point.year)))].sort((a, b) => a - b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const yearSpan = Math.max(maxYear - minYear, 1);
  const max = niceMax(Math.max(...nonEmpty.flatMap((item) => item.points.map((point) => point.value))));

  const plotHeight = BASELINE - PLOT_TOP;
  const plotWidth = VIEW_WIDTH - PLOT_LEFT;
  const xForYear = (year: number) => PLOT_LEFT + ((year - minYear) / yearSpan) * plotWidth;
  const yForValue = (value: number) => BASELINE - (value / max) * plotHeight;

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
        {gridSteps.map((step) => {
          const y = BASELINE - plotHeight * step;
          return (
            <g key={step}>
              <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={y} y2={y} stroke={CHART_INK.gridline} strokeWidth="1" />
              <text x={PLOT_LEFT} y={y - 4} fontSize="10" fill={CHART_INK.muted}>{formatCompactMoney(max * step)}</text>
            </g>
          );
        })}
        <line x1={PLOT_LEFT} x2={VIEW_WIDTH} y1={BASELINE} y2={BASELINE} stroke={CHART_INK.baseline} strokeWidth="1" />

        {nonEmpty.map((item) => {
          const linePath = item.points.map((point, index) => `${index === 0 ? "M" : "L"}${xForYear(point.year)},${yForValue(point.value)}`).join(" ");
          const last = item.points[item.points.length - 1];
          return (
            <g key={item.label}>
              <path d={linePath} fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={xForYear(last.year)} cy={yForValue(last.value)} r="5" fill={item.color} stroke={CHART_INK.surface} strokeWidth="2" />
              <text x={xForYear(last.year)} y={yForValue(last.value) - 10} fontSize="11" fontWeight="700" fill={CHART_INK.primary} textAnchor="end">{formatCompactMoney(last.value)}</text>
            </g>
          );
        })}

        {xLabels.map((year) => (
          <text key={year} x={xForYear(year)} y={BASELINE + 16} fontSize="11" fill={CHART_INK.secondary} textAnchor="middle">{year}</text>
        ))}

        {hoveredYear !== undefined && (
          <line x1={xForYear(hoveredYear)} x2={xForYear(hoveredYear)} y1={PLOT_TOP} y2={BASELINE} stroke={CHART_INK.baseline} strokeWidth="1" />
        )}
        {hoveredYear !== undefined && nonEmpty.map((item) => {
          const value = valueAtYear(item.points, hoveredYear);
          if (value === undefined) return null;
          return <circle key={item.label} cx={xForYear(hoveredYear)} cy={yForValue(value)} r="5" fill={item.color} stroke={CHART_INK.surface} strokeWidth="2" />;
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

      {hoveredYear !== undefined && (
        <div className="chart-tooltip">
          {nonEmpty.map((item) => {
            const value = valueAtYear(item.points, hoveredYear);
            if (value === undefined) return null;
            return (
              <strong key={item.label}>{item.label}: {formatMoney(value)}</strong>
            );
          })}
          <span>{hoveredYear}</span>
        </div>
      )}
    </div>
  );
}
