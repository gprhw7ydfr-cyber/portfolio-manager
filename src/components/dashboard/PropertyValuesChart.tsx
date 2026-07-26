import type { NamedValue } from "../../domain/dashboard/calculateDashboardCharts";
import { SEQUENTIAL_BLUE, CHART_INK } from "./chartPalette";
import { formatMoney, formatCompactMoney } from "../../domain/shared/formatMoney";

interface PropertyValuesChartProps {
  properties: NamedValue[];
}

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 260;
const PLOT_TOP = 24;
const BASELINE = 220;
const BAR_MAX_WIDTH = 24;

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function PropertyValuesChart({ properties }: PropertyValuesChartProps) {
  if (properties.length === 0) {
    return <p className="chart-empty">No properties recorded yet.</p>;
  }

  const max = niceMax(Math.max(...properties.map((property) => property.value)));
  const plotHeight = BASELINE - PLOT_TOP;
  const bandWidth = VIEW_WIDTH / properties.length;
  const barWidth = Math.min(BAR_MAX_WIDTH, bandWidth * 0.5);
  const gridSteps = [0.25, 0.5, 0.75, 1];

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="bar-chart" role="img" aria-label="Property values">
        {gridSteps.map((step) => {
          const y = BASELINE - plotHeight * step;
          return (
            <g key={step}>
              <line x1="0" x2={VIEW_WIDTH} y1={y} y2={y} stroke={CHART_INK.gridline} strokeWidth="1" />
              <text x="0" y={y - 4} fontSize="10" fill={CHART_INK.muted}>{formatCompactMoney(max * step)}</text>
            </g>
          );
        })}
        <line x1="0" x2={VIEW_WIDTH} y1={BASELINE} y2={BASELINE} stroke={CHART_INK.baseline} strokeWidth="1" />
        {properties.map((property, index) => {
          const barHeight = Math.max((property.value / max) * plotHeight, 0);
          const x = index * bandWidth + (bandWidth - barWidth) / 2;
          const y = BASELINE - barHeight;
          return (
            <g key={property.label} className="bar-chart__bar">
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx="4" fill={SEQUENTIAL_BLUE}>
                <title>{`${property.label}: ${formatMoney(property.value)}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={y - 6} fontSize="11" fill={CHART_INK.secondary} textAnchor="middle">{formatCompactMoney(property.value)}</text>
              <text x={x + barWidth / 2} y={BASELINE + 16} fontSize="11" fill={CHART_INK.secondary} textAnchor="middle">{property.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
