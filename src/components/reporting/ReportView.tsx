import type { ReportData } from "../../domain/reporting/ReportData";
import { reportToCsv, reportToJson, downloadFile, slugifyFilename } from "../../domain/reporting/exportReport";
import { MultiSeriesTrendChart } from "../scenario/MultiSeriesTrendChart";
import { PropertyValuesChart } from "../dashboard/PropertyValuesChart";
import { AssetAllocationChart } from "../dashboard/AssetAllocationChart";
import { getCategorical } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";

interface ReportViewProps {
  report: ReportData;
  onBack: () => void;
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const multiplier = (value: number) => `${value.toFixed(2)}x`;

/** Only "money" (the default) needs no override — MultiSeriesTrendChart already defaults to
 *  money formatting when these props are omitted. `flatFallbackExtent` matters too: the money
 *  default of 100 reads as an absurd "10000%" once run through a percent formatter on an
 *  all-zero series (e.g. no property value/cash invested yet). */
function chartFormatters(format: "money" | "percent" | "multiplier" | undefined) {
  if (format === "percent") return { formatValue: percent, formatCompactValue: percent, flatFallbackExtent: 1 };
  if (format === "multiplier") return { formatValue: multiplier, formatCompactValue: multiplier, flatFallbackExtent: 1 };
  return {};
}

export function ReportView({ report, onBack }: ReportViewProps) {
  const [theme] = useTheme();
  const paletteColors = Object.values(getCategorical(theme));
  const filename = slugifyFilename(report.title);
  const generatedAt = new Date(report.generatedAt).toLocaleString("en-NZ");

  const exportCsv = () => downloadFile(`${filename}.csv`, reportToCsv(report), "text/csv");
  const exportJson = () => downloadFile(`${filename}.json`, reportToJson(report), "application/json");

  return (
    <div className="report-view">
      <div className="calculator__heading report-view__toolbar">
        <button className="button button--secondary" onClick={onBack}>&larr; Back to reports</button>
        <div className="report-view__actions">
          <button className="text-button" onClick={exportCsv}>Export CSV</button>
          <button className="text-button" onClick={exportJson}>Export JSON</button>
          <button className="text-button" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
      </div>

      <div className="report-view__header">
        <p className="eyebrow">Report</p>
        <h2>{report.title}</h2>
        <p className="muted">Generated {generatedAt}</p>
      </div>

      {report.sections.map((section) => (
        <section className="property-section report-section" key={section.heading}>
          <h4>{section.heading}</h4>
          {section.rows.length > 0 && (
            <table className="report-table">
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {section.table && (
            <table className="report-table report-table--comparison">
              <thead>
                <tr>
                  <th></th>
                  {section.table.columns.map((column) => <th key={column}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    {row.values.map((value, index) => <td key={index}>{value}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {section.chart?.kind === "trend" && (
            <MultiSeriesTrendChart
              seriesLabel={section.chart.seriesLabel}
              series={section.chart.series.map((series, index) => ({
                label: series.label,
                color: paletteColors[index % paletteColors.length],
                points: series.points,
              }))}
              {...chartFormatters(section.chart.format)}
            />
          )}
          {section.chart?.kind === "bar" && <PropertyValuesChart properties={section.chart.values} />}
          {section.chart?.kind === "allocation" && <AssetAllocationChart slices={section.chart.slices} />}
        </section>
      ))}
    </div>
  );
}
