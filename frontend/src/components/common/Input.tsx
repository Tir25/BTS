/**
 * Input
 * Reusable input with label, error and helper text; supports full width by default.
 */
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  fullWidth = true,
  className,
  id,
  ...props
}) => {
  const inputId = id || props.name;
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClasses = error ? 'border-red-400 focus:ring-red-500' : 'border-slate-300';
  const classes = [
    widthClass,
    'px-4 py-3 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
    errorClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}
      <input id={inputId} className={classes} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && <p className="mt-1 text-sm text-slate-500">{helperText}</p>}
    </div>
  );
};

export default Input;


