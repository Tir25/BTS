import React from 'react';
import { motion } from 'framer-motion';

interface PremiumButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden';

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus:ring-blue-400',
    secondary:
      'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30 shadow-lg hover:shadow-xl focus:ring-white/20',
    danger:
      'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus:ring-red-400',
    ghost:
      'bg-transparent text-white hover:bg-white/10 border border-transparent hover:border-white/20 focus:ring-white/20',
    gradient:
      'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:via-pink-500 hover:to-red-500 text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/25 focus:ring-purple-400',
  };

  const hoverEffect = 'hover:-translate-y-0.5 active:translate-y-0';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${hoverEffect}
        ${className}
      `}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />

      {/* Content */}
      <div className="relative z-10 flex items-center gap-2">
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          />
        )}

        {icon && iconPosition === 'left' && !loading && (
          <span className="flex-shrink-0">{icon}</span>
        )}

        <span>{children}</span>

        {icon && iconPosition === 'right' && !loading && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </div>
    </motion.button>
  );
};

// Specialized button variants
export const GlowButton: React.FC<PremiumButtonProps> = ({
  children,
  className = '',
  ...props
}) => (
  <motion.div whileHover={{ scale: 1.05 }} className="relative">
    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-0 hover:opacity-50 transition-opacity duration-300" />
    <PremiumButton className={`relative ${className}`} {...props}>
      {children}
    </PremiumButton>
  </motion.div>
);

export const FloatingButton: React.FC<PremiumButtonProps> = ({
  children,
  className = '',
  ...props
}) => (
  <motion.div
    animate={{
      y: [0, -5, 0],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  >
    <PremiumButton className={className} {...props}>
      {children}
    </PremiumButton>
  </motion.div>
);

export const IconButton: React.FC<PremiumButtonProps> = ({
  children,
  className = '',
  ...props
}) => (
  <PremiumButton
    size="md"
    className={`p-3 rounded-full ${className}`}
    {...props}
  >
    {children}
  </PremiumButton>
);

export default PremiumButton;
