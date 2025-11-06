import React from 'react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="mt-20 text-center px-4"
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-300" />
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-300" />
      </div>
      <p className="text-sm text-slate-600 font-medium">Real-time tracking • Modern technology • Always reliable</p>
      <p className="text-xs text-slate-400 mt-2">Ganpat University Bus Tracking System</p>
    </motion.div>
  );
};

export default Footer;


