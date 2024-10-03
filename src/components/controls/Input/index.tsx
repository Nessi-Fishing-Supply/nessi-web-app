import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styles from './Input.module.scss';

interface InputProps {
  name: string;
  label?: string;
  helperText?: string;
  icon?: React.ReactNode;
  type?: string;
  placeholder?: string;
}

const Input: React.FC<InputProps> = ({
  name,
  label,
  helperText,
  icon,
  type = 'text',
  placeholder,
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error, isTouched, isDirty } }) => (
        <div className={`${styles.inputWrapper}`}>
          {label && <label className={styles.label} htmlFor={name}>{label}</label>}
          <div className={`${styles.inputContainer} 
              ${error ? styles.error : ''} 
              ${isTouched && !error && isDirty ? styles.success : ''} 
              ${isTouched ? styles.focused : ''}`}
          >
            <input
              id={name}
              type={type}
              placeholder={placeholder}
              {...field}
              className={styles.input}
            />
            {icon && <span className={styles.icon}>{icon}</span>}
          </div>
          {helperText && !error && <small className={styles.helperText}>{helperText}</small>}
          {error && <small className={styles.errorText}>{error.message}</small>}
        </div>
      )}
    />
  );
};

export default Input;