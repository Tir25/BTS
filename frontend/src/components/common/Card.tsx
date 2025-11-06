/**
 * Card
 * Generic container with border, shadow and configurable padding.
 */
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({ padding = 'md', className, children, ...props }) => {
  const classes = [
    'bg-white border border-slate-200 rounded-2xl shadow-lg',
    paddingMap[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;


