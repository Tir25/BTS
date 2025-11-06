import React from 'react';
import { motion } from 'framer-motion';

const Hero: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-12 sm:mb-16 px-4"
    >
      <div className="inline-block p-3 bg-blue-100 rounded-2xl mb-6">
        <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 text-slate-900 leading-tight">
        <span className="bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">Ganpat University</span>
      </h1>
      <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-slate-400 mx-auto rounded-full mb-3" />
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-700 mb-2 leading-tight">Bus Tracker</h2>
      <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto">Real-time tracking for a smarter commute</p>
    </motion.div>
  );
};

export default Hero;


