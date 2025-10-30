import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTransition } from './transitions';

// SVG Icon Components - Production Optimized
const BusIcon = () => (
  <svg
    className="w-12 h-12 sm:w-16 sm:h-16 custom-icon"
    viewBox="0 0 48 48"
    width="48"
    height="48"
    fill="none"
    aria-label="Bus Icon"
    style={{ display: 'block', margin: '0 auto' }}
  >
    {/* Bus Body - Main Structure */}
    <rect
      x="4"
      y="12"
      width="40"
      height="20"
      rx="2"
      fill="#3B82F6"
      stroke="#1E40AF"
      strokeWidth="1"
    />

    {/* Bus Windows */}
    <rect
      x="6"
      y="14"
      width="8"
      height="6"
      rx="1"
      fill="#E0F2FE"
      stroke="#0EA5E9"
      strokeWidth="0.5"
    />
    <rect
      x="16"
      y="14"
      width="8"
      height="6"
      rx="1"
      fill="#E0F2FE"
      stroke="#0EA5E9"
      strokeWidth="0.5"
    />
    <rect
      x="26"
      y="14"
      width="8"
      height="6"
      rx="1"
      fill="#E0F2FE"
      stroke="#0EA5E9"
      strokeWidth="0.5"
    />
    <rect
      x="36"
      y="14"
      width="6"
      height="6"
      rx="1"
      fill="#E0F2FE"
      stroke="#0EA5E9"
      strokeWidth="0.5"
    />

    {/* Bus Door */}
    <rect
      x="18"
      y="22"
      width="12"
      height="8"
      rx="1"
      fill="#FEF3C7"
      stroke="#F59E0B"
      strokeWidth="0.5"
    />
    <line x1="24" y1="22" x2="24" y2="30" stroke="#F59E0B" strokeWidth="1" />

    {/* Wheels */}
    <circle
      cx="12"
      cy="34"
      r="3"
      fill="#374151"
      stroke="#1F2937"
      strokeWidth="1"
    />
    <circle cx="12" cy="34" r="1.5" fill="#6B7280" />
    <circle
      cx="36"
      cy="34"
      r="3"
      fill="#374151"
      stroke="#1F2937"
      strokeWidth="1"
    />
    <circle cx="36" cy="34" r="1.5" fill="#6B7280" />

    {/* Headlights */}
    <circle cx="8" cy="16" r="1" fill="#FEF3C7" />
    <circle cx="40" cy="16" r="1" fill="#FEF3C7" />

    {/* Side Mirrors */}
    <rect x="2" y="16" width="2" height="4" rx="1" fill="#6B7280" />
    <rect x="44" y="16" width="2" height="4" rx="1" fill="#6B7280" />

    {/* Bus Number/Logo Area */}
    <rect
      x="28"
      y="16"
      width="8"
      height="3"
      rx="0.5"
      fill="#FEF3C7"
      opacity="0.8"
    />
    <text
      x="32"
      y="18"
      textAnchor="middle"
      fontSize="2"
      fill="#1F2937"
      fontFamily="Arial, sans-serif"
    >
      GU
    </text>
  </svg>
);

const MapIcon = () => (
  <svg
    className="w-12 h-12 sm:w-16 sm:h-16 custom-icon"
    viewBox="0 0 48 48"
    width="48"
    height="48"
    fill="none"
    aria-label="Map Icon"
    style={{ display: 'block', margin: '0 auto' }}
  >
    {/* Map Background */}
    <rect
      x="4"
      y="8"
      width="40"
      height="32"
      rx="2"
      fill="#F0FDF4"
      stroke="#16A34A"
      strokeWidth="1"
    />

    {/* Map Grid Lines */}
    <line x1="8" y1="16" x2="40" y2="16" stroke="#BBF7D0" strokeWidth="0.5" />
    <line x1="8" y1="24" x2="40" y2="24" stroke="#BBF7D0" strokeWidth="0.5" />
    <line x1="8" y1="32" x2="40" y2="32" stroke="#BBF7D0" strokeWidth="0.5" />
    <line x1="16" y1="12" x2="16" y2="36" stroke="#BBF7D0" strokeWidth="0.5" />
    <line x1="24" y1="12" x2="24" y2="36" stroke="#BBF7D0" strokeWidth="0.5" />
    <line x1="32" y1="12" x2="32" y2="36" stroke="#BBF7D0" strokeWidth="0.5" />

    {/* Roads */}
    <rect
      x="12"
      y="20"
      width="16"
      height="2"
      fill="#FEF3C7"
      stroke="#F59E0B"
      strokeWidth="0.5"
    />
    <rect
      x="20"
      y="12"
      width="2"
      height="16"
      fill="#FEF3C7"
      stroke="#F59E0B"
      strokeWidth="0.5"
    />

    {/* Buildings */}
    <rect
      x="10"
      y="26"
      width="4"
      height="8"
      fill="#E5E7EB"
      stroke="#6B7280"
      strokeWidth="0.5"
    />
    <rect
      x="16"
      y="28"
      width="4"
      height="6"
      fill="#E5E7EB"
      stroke="#6B7280"
      strokeWidth="0.5"
    />
    <rect
      x="22"
      y="26"
      width="4"
      height="8"
      fill="#E5E7EB"
      stroke="#6B7280"
      strokeWidth="0.5"
    />
    <rect
      x="28"
      y="28"
      width="4"
      height="6"
      fill="#E5E7EB"
      stroke="#6B7280"
      strokeWidth="0.5"
    />
    <rect
      x="34"
      y="26"
      width="4"
      height="8"
      fill="#E5E7EB"
      stroke="#6B7280"
      strokeWidth="0.5"
    />

    {/* Windows on Buildings */}
    <rect x="11" y="28" width="1" height="1" fill="#3B82F6" />
    <rect x="13" y="28" width="1" height="1" fill="#3B82F6" />
    <rect x="17" y="30" width="1" height="1" fill="#3B82F6" />
    <rect x="19" y="30" width="1" height="1" fill="#3B82F6" />
    <rect x="23" y="28" width="1" height="1" fill="#3B82F6" />
    <rect x="25" y="28" width="1" height="1" fill="#3B82F6" />
    <rect x="29" y="30" width="1" height="1" fill="#3B82F6" />
    <rect x="31" y="30" width="1" height="1" fill="#3B82F6" />
    <rect x="35" y="28" width="1" height="1" fill="#3B82F6" />
    <rect x="37" y="28" width="1" height="1" fill="#3B82F6" />

    {/* Location Pin */}
    <circle
      cx="24"
      cy="22"
      r="2"
      fill="#EF4444"
      stroke="#DC2626"
      strokeWidth="0.5"
    />
    <path
      d="M24 24 L26 28 L22 28 Z"
      fill="#EF4444"
      stroke="#DC2626"
      strokeWidth="0.5"
    />
    <circle cx="24" cy="22" r="0.5" fill="#FFFFFF" />

    {/* Compass Rose */}
    <circle
      cx="36"
      cy="16"
      r="3"
      fill="#FEF3C7"
      stroke="#F59E0B"
      strokeWidth="0.5"
    />
    <text
      x="36"
      y="18"
      textAnchor="middle"
      fontSize="2"
      fill="#1F2937"
      fontFamily="Arial, sans-serif"
    >
      N
    </text>
    <text
      x="36"
      y="22"
      textAnchor="middle"
      fontSize="2"
      fill="#1F2937"
      fontFamily="Arial, sans-serif"
    >
      S
    </text>
    <text
      x="33"
      y="20"
      textAnchor="middle"
      fontSize="2"
      fill="#1F2937"
      fontFamily="Arial, sans-serif"
    >
      W
    </text>
    <text
      x="39"
      y="20"
      textAnchor="middle"
      fontSize="2"
      fill="#1F2937"
      fontFamily="Arial, sans-serif"
    >
      E
    </text>
  </svg>
);

const AdminIcon = () => (
  <svg
    className="w-12 h-12 sm:w-16 sm:h-16 custom-icon"
    viewBox="0 0 48 48"
    width="48"
    height="48"
    fill="none"
    aria-label="Admin Icon"
    style={{ display: 'block', margin: '0 auto' }}
  >
    {/* Dashboard Background */}
    <rect
      x="4"
      y="8"
      width="40"
      height="32"
      rx="3"
      fill="#F8FAFC"
      stroke="#8B5CF6"
      strokeWidth="1"
    />

    {/* Header Bar */}
    <rect
      x="6"
      y="10"
      width="36"
      height="4"
      rx="1"
      fill="#8B5CF6"
      opacity="0.8"
    />
    <circle cx="8" cy="12" r="1" fill="#FFFFFF" />
    <circle cx="10" cy="12" r="1" fill="#FFFFFF" />
    <circle cx="12" cy="12" r="1" fill="#FFFFFF" />

    {/* Sidebar */}
    <rect
      x="6"
      y="16"
      width="8"
      height="20"
      rx="1"
      fill="#E9D5FF"
      stroke="#A855F7"
      strokeWidth="0.5"
    />

    {/* Sidebar Icons */}
    <rect x="8" y="18" width="4" height="2" rx="0.5" fill="#7C3AED" />
    <rect x="8" y="22" width="4" height="2" rx="0.5" fill="#7C3AED" />
    <rect x="8" y="26" width="4" height="2" rx="0.5" fill="#7C3AED" />
    <rect x="8" y="30" width="4" height="2" rx="0.5" fill="#7C3AED" />

    {/* Main Content Area */}
    <rect
      x="16"
      y="16"
      width="26"
      height="20"
      rx="1"
      fill="#FFFFFF"
      stroke="#DDD6FE"
      strokeWidth="0.5"
    />

    {/* Content Grid */}
    <rect
      x="18"
      y="18"
      width="10"
      height="6"
      rx="1"
      fill="#F3E8FF"
      stroke="#C084FC"
      strokeWidth="0.5"
    />
    <rect
      x="30"
      y="18"
      width="10"
      height="6"
      rx="1"
      fill="#F3E8FF"
      stroke="#C084FC"
      strokeWidth="0.5"
    />
    <rect
      x="18"
      y="26"
      width="10"
      height="8"
      rx="1"
      fill="#F3E8FF"
      stroke="#C084FC"
      strokeWidth="0.5"
    />
    <rect
      x="30"
      y="26"
      width="10"
      height="8"
      rx="1"
      fill="#F3E8FF"
      stroke="#C084FC"
      strokeWidth="0.5"
    />

    {/* Chart Lines */}
    <path
      d="M20 22 L22 21 L24 23 L26 20 L28 22"
      stroke="#8B5CF6"
      strokeWidth="1"
      fill="none"
    />
    <path
      d="M32 22 L34 21 L36 23 L38 20 L40 22"
      stroke="#8B5CF6"
      strokeWidth="1"
      fill="none"
    />

    {/* Data Points */}
    <circle cx="20" cy="22" r="0.5" fill="#8B5CF6" />
    <circle cx="22" cy="21" r="0.5" fill="#8B5CF6" />
    <circle cx="24" cy="23" r="0.5" fill="#8B5CF6" />
    <circle cx="26" cy="20" r="0.5" fill="#8B5CF6" />
    <circle cx="28" cy="22" r="0.5" fill="#8B5CF6" />
    <circle cx="32" cy="22" r="0.5" fill="#8B5CF6" />
    <circle cx="34" cy="21" r="0.5" fill="#8B5CF6" />
    <circle cx="36" cy="23" r="0.5" fill="#8B5CF6" />
    <circle cx="38" cy="20" r="0.5" fill="#8B5CF6" />
    <circle cx="40" cy="22" r="0.5" fill="#8B5CF6" />

    {/* Bar Chart */}
    <rect x="20" y="30" width="2" height="2" fill="#8B5CF6" />
    <rect x="23" y="29" width="2" height="3" fill="#8B5CF6" />
    <rect x="26" y="28" width="2" height="4" fill="#8B5CF6" />
    <rect x="29" y="31" width="2" height="1" fill="#8B5CF6" />
    <rect x="32" y="30" width="2" height="2" fill="#8B5CF6" />
    <rect x="35" y="29" width="2" height="3" fill="#8B5CF6" />
    <rect x="38" y="28" width="2" height="4" fill="#8B5CF6" />

    {/* Settings Gear */}
    <circle
      cx="40"
      cy="12"
      r="2"
      fill="#8B5CF6"
      stroke="#7C3AED"
      strokeWidth="0.5"
    />
    <circle cx="40" cy="12" r="1" fill="#FFFFFF" />
    <path
      d="M40 10 L40 8 M40 16 L40 14 M46 12 L44 12 M36 12 L34 12"
      stroke="#7C3AED"
      strokeWidth="0.5"
      strokeLinecap="round"
    />
  </svg>
);

const PremiumHomepage: React.FC = () => {
  const navigate = useNavigate();
  const { setTransition } = useTransition();

  const handleNavigation = (path: string) => {
    // Set transition type based on destination
    if (path.includes('login')) {
      setTransition('homepage-to-login');
    } else if (path.includes('student') || path.includes('student-map')) {
      setTransition('homepage-to-map');
    } else {
      setTransition('default');
    }

    // setIsTransitioning(true); // This line was removed as per the new_code

    // Add a small delay for smooth transition
    setTimeout(() => {
      navigate(path);
    }, 200);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Enhanced Heading */}
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
            <span className="bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
              Ganpat University
            </span>
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-slate-400 mx-auto rounded-full mb-3" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-700 mb-2 leading-tight">
            Bus Tracker
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto">
            Real-time tracking for a smarter commute
          </p>
        </motion.div>

        {/* Navigation Cards Container */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 w-full max-w-5xl px-4">
          {/* Driver Interface Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border-2 border-blue-200 rounded-2xl shadow-md hover:shadow-xl hover:border-blue-400 transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={() => handleNavigation('/driver-login')}
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Accent decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
            
            <div className="relative p-8 flex flex-col items-center text-center min-h-[240px]">
              <div className="mb-6 p-4 bg-blue-100 rounded-2xl group-hover:bg-blue-200 transition-colors duration-300">
                <BusIcon />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">
                Driver Interface
              </h3>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Real-time location sharing & navigation
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Get Started</span>
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Student Map Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border-2 border-green-200 rounded-2xl shadow-md hover:shadow-xl hover:border-green-400 transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={() => handleNavigation('/student-map')}
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Accent decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-400" />
            
            <div className="relative p-8 flex flex-col items-center text-center min-h-[240px]">
              <div className="mb-6 p-4 bg-green-100 rounded-2xl group-hover:bg-green-200 transition-colors duration-300">
                <MapIcon />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 group-hover:text-green-700 transition-colors">
                Student Map
              </h3>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Live bus tracking & route information
              </p>
              <div className="flex items-center text-green-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Explore</span>
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Admin Panel Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative bg-white border-2 border-purple-200 rounded-2xl shadow-md hover:shadow-xl hover:border-purple-400 transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={() => handleNavigation('/admin-login')}
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Accent decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-400" />
            
            <div className="relative p-8 flex flex-col items-center text-center min-h-[240px]">
              <div className="mb-6 p-4 bg-purple-100 rounded-2xl group-hover:bg-purple-200 transition-colors duration-300">
                <AdminIcon />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 group-hover:text-purple-700 transition-colors">
                Admin Panel
              </h3>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                Fleet management & analytics dashboard
              </p>
              <div className="flex items-center text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Access</span>
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Footer */}
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
          <p className="text-sm text-slate-600 font-medium">
            Real-time tracking • Modern technology • Always reliable
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Ganpat University Bus Tracking System
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PremiumHomepage;
