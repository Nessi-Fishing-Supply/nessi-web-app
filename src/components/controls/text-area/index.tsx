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

const Textarea: React.FC<TextareaProps> = ({
  name,
  label,
  value,
  placeholder,
  helperText,
  onChange,
  isRequired = false,
}) => {
  const formContext = useFormContext();
  if (!formContext) {
    return null;
  }
  const { control } = formContext;

  const errorId = `${name}-error`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={`textareaWrapper ${error ? 'error' : ''}`}>
          {label && (
            <label htmlFor={name}>
              {label}
              {isRequired && (
                <>
                  <span aria-hidden="true">*</span>
                  <span className="sr-only"> (required)</span>
                </>
              )}
            </label>
          )}
          <textarea
            {...field}
            id={name}
            value={value}
            placeholder={placeholder}
            className="textarea"
            aria-required={isRequired}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              field.onChange(e);
              if (onChange) onChange(e);
            }}
          />
          {helperText && !error && <small className="helperText">{helperText}</small>}
          {error && (
            <small id={errorId} className="errorText" role="alert">
              {error.message}
            </small>
          )}
        </div>
      )}
    />
  );
};

export default Textarea;
