import type { ChangeEventHandler, ReactNode } from "react";

interface InputRowProps {
  label: string;
  value: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
  prefix?: ReactNode;
  suffix?: ReactNode;
  min?: number;
  step?: number;
}

export function InputRow({ label, value, onChange, prefix, suffix, min = 0, step = 1 }: InputRowProps) {
  return (
    <label className="input-row">
      <span>{label}</span>
      <span className="input-row__control">
        {prefix && <span className="input-row__adornment">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onFocus={(event) => {
            if (value === 0) event.currentTarget.select();
          }}
          onChange={(event) => {
            if (value === 0 && /^0+(?=\d)/.test(event.currentTarget.value)) {
              event.currentTarget.value = event.currentTarget.value.replace(/^0+(?=\d)/, "");
            }
            onChange(event);
          }}
        />
        {suffix && <span className="input-row__adornment">{suffix}</span>}
      </span>
    </label>
  );
}
