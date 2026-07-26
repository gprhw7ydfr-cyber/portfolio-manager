import type { AllocationSlice } from "../../domain/dashboard/calculateDashboardCharts";
import { ASSET_TYPE_COLOR } from "./chartPalette";
import { formatMoney } from "../../domain/shared/formatMoney";

interface AssetAllocationChartProps {
  slices: AllocationSlice[];
}

const VIEW_WIDTH = 600;
const BAR_HEIGHT = 22;
const GAP = 2;

export function AssetAllocationChart({ slices }: AssetAllocationChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return <p className="chart-empty">No assets recorded yet.</p>;
  }

  const totalGap = GAP * Math.max(slices.length - 1, 0);
  const segments = slices.reduce<(AllocationSlice & { x: number; width: number })[]>((acc, slice) => {
    const previous = acc.at(-1);
    const x = previous ? previous.x + previous.width + GAP : 0;
    const width = (slice.value / total) * (VIEW_WIDTH - totalGap);
    acc.push({ ...slice, x, width });
    return acc;
  }, []);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${BAR_HEIGHT}`} className="allocation-bar" role="img" aria-label="Asset allocation by type">
        <defs>
          <clipPath id="allocation-clip">
            <rect x="0" y="0" width={VIEW_WIDTH} height={BAR_HEIGHT} rx="4" />
          </clipPath>
        </defs>
        <g clipPath="url(#allocation-clip)">
          {segments.map((segment) => (
            <rect
              key={segment.type}
              className="allocation-segment"
              x={segment.x}
              y="0"
              width={Math.max(segment.width, 0)}
              height={BAR_HEIGHT}
              fill={ASSET_TYPE_COLOR[segment.type]}
            >
              <title>{`${segment.label}: ${formatMoney(segment.value)} (${((segment.value / total) * 100).toFixed(0)}%)`}</title>
            </rect>
          ))}
        </g>
      </svg>
      <ul className="chart-legend">
        {segments.map((segment) => (
          <li key={segment.type}>
            <span className="chart-legend__swatch" style={{ background: ASSET_TYPE_COLOR[segment.type] }} />
            <span className="chart-legend__label">{segment.label}</span>
            <span className="chart-legend__value">{formatMoney(segment.value)}</span>
            <span className="chart-legend__percent">{((segment.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
