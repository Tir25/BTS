import React from 'react';
import { motion } from 'framer-motion';

interface GlassyCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'premium' | 'ultra';
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
  delay?: number;
  padding?: string;
}

const GlassyCard: React.FC<GlassyCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hover = true,
  glow = false,
  onClick,
  delay = 0,
  padding = '',
}) => {
  const baseClasses =
    'relative overflow-hidden rounded-2xl transition-all duration-500';

  const variantClasses = {
    default: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl',
    premium: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl',
    ultra: 'bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl',
  };

  const hoverClasses = hover
    ? 'hover:bg-white/15 hover:border-white/30 hover:-translate-y-1 hover:shadow-2xl'
    : '';
  const glowClasses = glow ? 'hover:shadow-blue-500/20 hover:shadow-2xl' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.4, 0.0, 0.2, 1],
      }}
      whileHover={
        hover
          ? {
              y: -8,
              scale: 1.02,
              transition: { duration: 0.3 },
            }
          : {}
      }
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${hoverClasses}
        ${glowClasses}
        ${clickableClasses}
        ${className}
      `}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />

      {/* Glow effect */}
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      )}

      {/* Content */}
      <div className={`relative z-10 ${padding}`}>{children}</div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
    </motion.div>
  );
};

// Specialized card variants
export const InfoCard: React.FC<GlassyCardProps> = (props) => (
  <GlassyCard variant="premium" glow={true} {...props} />
);

export const ActionCard: React.FC<GlassyCardProps> = (props) => (
  <GlassyCard
    variant="default"
    hover={true}
    onClick={props.onClick}
    {...props}
  />
);

export const PremiumCard: React.FC<GlassyCardProps> = (props) => (
  <GlassyCard variant="ultra" glow={true} hover={true} {...props} />
);

// Floating card with continuous animation
export const FloatingCard: React.FC<GlassyCardProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <GlassyCard className={className} {...props}>
        {children}
      </GlassyCard>
    </motion.div>
  );
};

// Interactive card with ripple effect
export const InteractiveCard: React.FC<GlassyCardProps> = ({
  children,
  className = '',
  onClick,
  ...props
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <GlassyCard className={className} onClick={onClick} {...props}>
        {children}
      </GlassyCard>
    </motion.div>
  );
};

export default GlassyCard;
