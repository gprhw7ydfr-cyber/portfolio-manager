interface ResultCardProps {
  label: string;
  value: string;
  supportingText?: string;
  emphasis?: boolean;
}

export function ResultCard({ label, value, supportingText, emphasis = false }: ResultCardProps) {
  return (
    <div className={`result-card${emphasis ? " result-card--emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {supportingText && <small>{supportingText}</small>}
    </div>
  );
}
