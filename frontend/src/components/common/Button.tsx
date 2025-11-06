/**
 * Button
 * Reusable button with variants and loading state; visually consistent across the app.
 */
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const baseClasses = 'py-3 px-4 rounded-xl font-medium transition-all duration-200';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg disabled:bg-slate-400',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 disabled:bg-slate-200',
  danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300',
  ghost: 'bg-transparent hover:bg-slate-50 text-slate-900',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const widthClass = fullWidth ? 'w-full' : '';
  const classes = [baseClasses, variantClasses[variant], widthClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>
      {isLoading ? (
        <span className="flex items-center justify-center">
          <div className="loading-spinner mr-2" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;


