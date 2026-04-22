import React, { useState, useEffect } from 'react';
import { maskDateInput, parseIndonesianDateInput, toIndonesianDateInput } from '../lib/utils';

interface DateInputMaskProps {
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export default function DateInputMask({ name, value, onChange, required, className, placeholder = "DD-MM-YYYY" }: DateInputMaskProps) {
  const [localValue, setLocalValue] = useState("");

  useEffect(() => {
    // When the parent (formData) provides a YYYY-MM-DD value, format it to DD-MM-YYYY for display
    if (value && value.includes('-') && value.split('-')[0].length === 4) {
      setLocalValue(toIndonesianDateInput(value));
    } else {
      setLocalValue(value || "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mask as they type
    const masked = maskDateInput(e.target.value);
    setLocalValue(masked);
    
    // Attempt parse to YYYY-MM-DD to send back upwards
    const parsed = parseIndonesianDateInput(masked);
    onChange({
      target: { name, value: parsed }
    });
  };

  return (
    <input
      type="text"
      name={name}
      required={required}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={10}
      className={className}
    />
  );
}
