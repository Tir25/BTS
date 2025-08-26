import React from 'react';

interface IconProps {
  name: 'bus' | 'map' | 'admin' | 'driver' | 'student' | 'settings';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  className = '',
  animated = false,
}) => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl sm:text-6xl',
    lg: 'text-6xl sm:text-8xl',
    xl: 'text-8xl sm:text-9xl',
  };

  const iconMap = {
    bus: '🚌',
    map: '🗺️',
    admin: '⚙️',
    driver: '👨‍💼',
    student: '🎓',
    settings: '⚙️',
  };

  const animationClass = animated ? 'animate-glow' : '';

  return (
    <div
      className={`${sizeClasses[size]} ${animationClass} ${className} select-none`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: '1',
        transform: 'translateZ(0)', // Force hardware acceleration
        willChange: animated ? 'transform, opacity' : 'auto',
      }}
    >
      {iconMap[name]}
    </div>
  );
};

export default Icon;
