import React, { forwardRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styles from './Checkbox.module.scss';
import { HiOutlineCheck } from 'react-icons/hi';

interface CheckboxProps {
  name: string;
  label: string;
  isRequired?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ name, label, isRequired = false }, ref) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={styles.checkboxWrapper}>
          {/* Hidden checkbox input */}
          <input
            type="checkbox"
            id={name}
            {...field}
            ref={ref}
            className={styles.checkboxInput}
          />

          {/* Custom label with icon */}
          <label htmlFor={name} className={styles.checkboxLabel}>
            <span className={`${styles.customCheckbox} ${field.value ? styles.checked : ''}`}>
              {field.value && <HiOutlineCheck className={styles.checkIcon} />}
            </span>
            {label}
            {isRequired && <span className={styles.requiredIndicator}>*</span>}
          </label>
          
          {error && <small className={styles.errorText}>{error.message}</small>}
        </div>
      )}
    />
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;