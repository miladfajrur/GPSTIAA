import React, { useState, useEffect } from 'react';
import { maskMonthYearInput, parseMonthYearInput, toIndonesianMonthYearInput } from '../lib/utils';

export interface MonthYearInputMaskProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  name?: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
}

export default function MonthYearInputMask({ name = '', value, onChange, ...rest }: MonthYearInputMaskProps) {
  const [localValue, setLocalValue] = useState("");

  useEffect(() => {
    // When the parent (formData) provides a YYYY-MM value, format it to MM-YYYY for display
    if (value && value.includes('-') && value.split('-')[0].length === 4) {
      setLocalValue(toIndonesianMonthYearInput(value));
    } else {
      setLocalValue(value || "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mask as they type
    const masked = maskMonthYearInput(e.target.value);
    setLocalValue(masked);
    
    // Attempt parse to YYYY-MM to send back upwards
    const parsed = parseMonthYearInput(masked);
    onChange({
      target: { name, value: parsed }
    } as any);
  };

  return (
    <input
      {...rest}
      type="text"
      name={name}
      value={localValue}
      onChange={handleChange}
      placeholder="MM-YYYY"
      maxLength={7}
    />
  );
}
