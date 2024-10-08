import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styles from './Checkbox.module.scss';
import { HiOutlineCheck } from 'react-icons/hi';

interface CheckboxProps {
  name: string;
  label: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ name, label }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={styles.checkboxWrapper}>
          {/* Hidden checkbox input */}
          <input
            type="checkbox"
            id={name}
            {...field}
            className={styles.checkboxInput}
          />
          
          {/* Custom label with icon */}
          <label htmlFor={name} className={styles.checkboxLabel}>
            <span className={`${styles.customCheckbox} ${field.value ? styles.checked : ''}`}>
              {field.value && <HiOutlineCheck className={styles.checkIcon} />}
            </span>
            {label}
          </label>
        </div>
      )}
    />
  );
};

export default Checkbox;