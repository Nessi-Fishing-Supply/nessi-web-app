// src/components/controls/Textarea.tsx
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

interface TextareaProps {
  name: string;
  label?: string;
  value?: string;
  placeholder?: string;
  helperText?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isRequired?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({ name, label, value, placeholder, helperText, onChange, isRequired = false }) => {
  const formContext = useFormContext();
  if (!formContext) {
    return null;
  }
  const { control } = formContext;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={`textareaWrapper ${error ? 'error' : ''}`}>
          {label && (
            <label htmlFor={name}>
              {label}
              {isRequired && <span>*</span>}
            </label>
          )}
          <textarea
            {...field}
            id={name}
            value={value}
            placeholder={placeholder}
            className="textarea"
            onChange={(e) => {
              field.onChange(e);
              if (onChange) onChange(e);
            }}
          />
          {helperText && !error && <small className="helperText">{helperText}</small>}
          {error && <small className="errorText">{error.message}</small>}
        </div>
      )}
    />
  );
};

export default Textarea;