import React from 'react';
import { motion } from 'framer-motion';

interface NavCardProps {
  accentColor: 'blue' | 'green' | 'purple';
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay?: number;
  cta: string;
}

const colorMap = {
  blue: {
    border: 'border-blue-200',
    borderHover: 'hover:border-blue-400',
    overlay: 'from-blue-50',
    bar: 'from-blue-500 to-blue-400',
    iconBg: 'bg-blue-100',
    iconBgHover: 'group-hover:bg-blue-200',
    titleHover: 'group-hover:text-blue-700',
    cta: 'text-blue-600',
  },
  green: {
    border: 'border-green-200',
    borderHover: 'hover:border-green-400',
    overlay: 'from-green-50',
    bar: 'from-green-500 to-green-400',
    iconBg: 'bg-green-100',
    iconBgHover: 'group-hover:bg-green-200',
    titleHover: 'group-hover:text-green-700',
    cta: 'text-green-600',
  },
  purple: {
    border: 'border-purple-200',
    borderHover: 'hover:border-purple-400',
    overlay: 'from-purple-50',
    bar: 'from-purple-500 to-purple-400',
    iconBg: 'bg-purple-100',
    iconBgHover: 'group-hover:bg-purple-200',
    titleHover: 'group-hover:text-purple-700',
    cta: 'text-purple-600',
  },
};

const NavCard: React.FC<NavCardProps> = ({ accentColor, title, description, icon, onClick, delay = 0.1, cta }) => {
  const c = colorMap[accentColor];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative bg-white border-2 ${c.border} rounded-2xl shadow-md ${c.borderHover} transition-all duration-300 cursor-pointer overflow-hidden`}
      onClick={onClick}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${c.overlay} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${c.bar}`} />
      <div className="relative p-8 flex flex-col items-center text-center min-h-[240px]">
        <div className={`mb-6 p-4 ${c.iconBg} rounded-2xl ${c.iconBgHover} transition-colors duration-300`}>{icon}</div>
        <h3 className={`text-xl sm:text-2xl font-bold text-slate-900 mb-3 ${c.titleHover} transition-colors`}>{title}</h3>
        <p className="text-sm sm:text-base text-slate-600 mb-4">{description}</p>
        <div className={`flex items-center ${c.cta} text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
          <span>{cta}</span>
          <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export default NavCard;


