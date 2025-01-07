import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styles from './Input.module.scss';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { FaCheckCircle } from 'react-icons/fa';

interface InputProps {
  name: string;
  label?: string;
  value?: string;
  helperText?: string;
  icon?: React.ReactNode;
  type?: string;
  placeholder?: string;
  isRequired?: boolean;
  showPasswordStrength?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const Input: React.FC<InputProps> = ({
  name,
  label,
  value,
  helperText,
  icon,
  type = 'text',
  placeholder,
  isRequired = false,
  showPasswordStrength = false,
  onChange,
}) => {
  const formContext = useFormContext();
  const { control } = formContext;
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  if (!formContext) {
    return null;
  }

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prevState) => !prevState);
  };

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordRequirements(requirements);

    if (requirements.length) strength += 1;
    if (requirements.uppercase) strength += 1;
    if (requirements.lowercase) strength += 1;
    if (requirements.number) strength += 1;
    if (requirements.specialChar) strength += 1;

    if (strength > 4) strength = 4;
    setPasswordStrength(strength);
  };

  const getStrengthClass = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return styles.weak;
      case 2:
        return styles.fair;
      case 3:
        return styles.good;
      case 4:
        return styles.strong;
      default:
        return '';
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      render={({ field, fieldState: { error, isTouched, isDirty } }) => (
        <div className={`${styles.wrapper}`}>
          {label && (
            <label className={styles.label} htmlFor={name}>
              {label}
              {isRequired && <span>*</span>}
            </label>
          )}
          <div className={`${styles.container} 
              ${error ? styles.error : ''} 
              ${isTouched && !error && isDirty ? styles.success : ''} 
              ${isFocused ? styles.focused : ''}`}
          >
            <input
              id={name}
              type={type === 'password' && isPasswordVisible ? 'text' : type}
              placeholder={placeholder}
              {...field}
              value={value}
              className={styles.input}
              onFocus={() => setIsFocused(true)}
              onBlur={(e) => {
                setIsFocused(false);
                if (!e.target.value) {
                  setShowProgressBar(false);
                }
              }}
              onChange={(e) => {
                field.onChange(e);
                if (onChange) onChange(e);
                if (type === 'password' && showPasswordStrength) {
                  checkPasswordStrength(e.target.value);
                  setShowProgressBar(!!e.target.value);
                }
              }}
            />
            {icon && <span className={styles.icon}>{icon}</span>}

            {type === 'password' && (
              <button
                type="button"
                className={styles.toggleButton}
                onClick={togglePasswordVisibility}
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                {isPasswordVisible ? <HiEyeOff /> : <HiEye />}
              </button>
            )}
          </div>

          {showPasswordStrength && showProgressBar && (
            <>
              <div className={styles.passwordStrengthBar}>
                <div
                  className={`${styles.passwordStrengthProgress} ${getStrengthClass()}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
                <small className={styles.passwordStrengthText}>
                  {passwordStrength === 0 || passwordStrength === 1 && 'Weak'}
                  {passwordStrength === 2 && 'Fair'}
                  {passwordStrength === 3 && 'Good'}
                  {passwordStrength === 4 && 'Strong'}
                </small>
              </div>
              <ul className={styles.passwordRequirements}>
                <li>
                  At least 8 characters {passwordRequirements.length && <FaCheckCircle className={styles.checkIcon} />}
                </li>
                <li>
                  At least one uppercase letter {passwordRequirements.uppercase && <FaCheckCircle className={styles.checkIcon} />}
                </li>
                <li>
                  At least one lowercase letter {passwordRequirements.lowercase && <FaCheckCircle className={styles.checkIcon} />}
                </li>
                <li>
                  At least one number {passwordRequirements.number && <FaCheckCircle className={styles.checkIcon} />}
                </li>
                <li>
                  At least one special character {passwordRequirements.specialChar && <FaCheckCircle className={styles.checkIcon} />}
                </li>
              </ul>
            </>
          )}

          {helperText && !error && <small className={styles.helperText}>{helperText}</small>}
          {error && <small className={styles.errorText}>{error.message}</small>}
        </div>
      )}
    />
  );
};

export default Input;