// src/components/controls/RadioButton.tsx
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

interface RadioButtonProps {
  name: string;
  label?: string;
  options: { value: string; label: string }[];
  helperText?: string;
}

const RadioButton: React.FC<RadioButtonProps> = ({ name, label, options, helperText }) => {
  const { control } = useFormContext();

  return (
    <div className="radioButtonWrapper">
      {label && <label className="radioGroupLabel">{label}</label>}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <>
            <div className="radioOptions">
              {options.map((option) => (
                <label key={option.value} className="radioOption">
                  <input
                    type="radio"
                    value={option.value}
                    checked={field.value === option.value}
                    onChange={() => field.onChange(option.value)}
                    className="radio"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {helperText && !error && <small className="helperText">{helperText}</small>}
            {error && <small className="errorText">{error.message}</small>}
          </>
        )}
      />
    </div>
  );
};

export default RadioButton;
