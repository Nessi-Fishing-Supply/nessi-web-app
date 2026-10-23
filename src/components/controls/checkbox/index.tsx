import React, { forwardRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styles from './checkbox.module.scss';
import { HiOutlineCheck } from 'react-icons/hi';

interface CheckboxProps {
  name: string;
  label: string;
  isRequired?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ name, label, isRequired = false }, ref) => {
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
              required={isRequired}
              aria-required={isRequired}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${name}-error` : undefined}
              className={styles.checkboxInput}
            />

            {/* Custom label with icon */}
            <label htmlFor={name} className={styles.checkboxLabel}>
              <span className={`${styles.customCheckbox} ${field.value ? styles.checked : ''}`}>
                {field.value && <HiOutlineCheck className={styles.checkIcon} />}
              </span>
              {label}
              {isRequired && (
                <>
                  <span className={styles.requiredIndicator} aria-hidden="true">
                    *
                  </span>
                  <span className="sr-only"> (required)</span>
                </>
              )}
            </label>

            {error && (
              <small id={`${name}-error`} className={styles.errorText} role="alert">
                {error.message}
              </small>
            )}
          </div>
        )}
      />
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
