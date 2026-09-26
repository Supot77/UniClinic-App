type Props = {
  'aria-label': string;
  className: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: string[];
  value: string;
};

export function RestrictedTimeSelect({
  'aria-label': ariaLabel,
  className,
  disabled = false,
  onChange,
  options,
  value,
}: Props) {
  const selectedValue = options.includes(value) ? value : '';

  return (
    <select
      aria-label={ariaLabel}
      value={selectedValue}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || options.length === 0}
      className={`${className} disabled:cursor-not-allowed disabled:bg-slate-100`}
    >
      <option value="" disabled>
        {options.length ? 'เลือกเวลา' : 'ไม่มีเวลาที่ใช้ได้'}
      </option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}
