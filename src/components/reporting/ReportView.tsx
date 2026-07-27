import type { ReportData } from "../../domain/reporting/ReportData";
import { reportToCsv, reportToJson, downloadFile, slugifyFilename } from "../../domain/reporting/exportReport";

interface ReportViewProps {
  report: ReportData;
  onBack: () => void;
}

export function ReportView({ report, onBack }: ReportViewProps) {
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
        </section>
      ))}
    </div>
  );
}
