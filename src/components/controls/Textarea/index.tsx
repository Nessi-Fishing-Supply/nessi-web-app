// src/components/controls/Textarea.tsx
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styles from './Textarea.module.scss';

interface TextareaProps {
  name: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
}

const Textarea: React.FC<TextareaProps> = ({ name, label, placeholder, helperText }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={`textareaWrapper ${error ? 'error' : ''}`}>
          {label && <label htmlFor={name}>{label}</label>}
          <textarea {...field} id={name} placeholder={placeholder} className="textarea" />
          {helperText && !error && <small className="helperText">{helperText}</small>}
          {error && <small className="errorText">{error.message}</small>}
        </div>
      )}
    />
  );
};

export default Textarea;