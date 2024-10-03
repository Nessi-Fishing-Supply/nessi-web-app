// src/components/controls/Checkbox.tsx
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styles from './Checkbox.module.scss';

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
        <div className="checkboxWrapper">
          <input type="checkbox" id={name} {...field} className="checkbox" />
          <label htmlFor={name} className="checkboxLabel">
            {label}
          </label>
        </div>
      )}
    />
  );
};

export default Checkbox;
