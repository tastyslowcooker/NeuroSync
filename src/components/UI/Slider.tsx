import React from 'react';

interface SliderProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  valueColorClass?: string;
  onChange: (val: number) => void;
  subLabels?: { left?: string; middle?: string[]; right?: string };
}

export const Slider: React.FC<SliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  valueColorClass = 'text-sky-400',
  onChange,
  subLabels
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs">
        <label htmlFor={id} className="text-slate-300 font-medium">{label}</label>
        <span className={`font-mono font-semibold ${valueColorClass}`}>
          {typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(1)) : value}{unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      {subLabels && (
        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          {subLabels.left && <span>{subLabels.left}</span>}
          {subLabels.middle && subLabels.middle.map((m, idx) => (
            <span key={idx} className="hidden sm:inline">{m}</span>
          ))}
          {subLabels.right && <span>{subLabels.right}</span>}
        </div>
      )}
    </div>
  );
};
