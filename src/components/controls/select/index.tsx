// src/components/controls/Select.tsx
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

interface SelectProps {
  name: string;
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  helperText?: string;
  error?: string;
}

const Select: React.FC<SelectProps> = ({ name, label, options, placeholder, helperText }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={`selectWrapper ${error ? 'error' : ''}`}>
          {label && <label htmlFor={name}>{label}</label>}
          <select {...field} id={name} className="select">
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {helperText && !error && <small className="helperText">{helperText}</small>}
          {error && <small className="errorText">{error.message}</small>}
        </div>
      )}
    />
  );
};

export default Select;
