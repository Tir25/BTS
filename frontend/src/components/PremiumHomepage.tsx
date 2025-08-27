import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StaggerContainer, StaggerItem } from './PageTransition';
import GlassyCard from './ui/GlassyCard';
import { useTransition } from './transitions';

// SVG Icon Components
const BusIcon = () => (
  <svg className="w-12 h-12 sm:w-16 sm:h-16" viewBox="0 0 48 48" fill="none">
    {/* Bus Body - Main Structure */}
    <rect x="4" y="12" width="40" height="20" rx="2" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1"/>
    
    {/* Bus Windows */}
    <rect x="6" y="14" width="8" height="6" rx="1" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="0.5"/>
    <rect x="16" y="14" width="8" height="6" rx="1" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="0.5"/>
    <rect x="26" y="14" width="8" height="6" rx="1" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="0.5"/>
    <rect x="36" y="14" width="6" height="6" rx="1" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth="0.5"/>
    
    {/* Bus Door */}
    <rect x="18" y="22" width="12" height="8" rx="1" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="0.5"/>
    <line x1="24" y1="22" x2="24" y2="30" stroke="#F59E0B" strokeWidth="1"/>
    
    {/* Wheels */}
    <circle cx="12" cy="34" r="3" fill="#374151" stroke="#1F2937" strokeWidth="1"/>
    <circle cx="12" cy="34" r="1.5" fill="#6B7280"/>
    <circle cx="36" cy="34" r="3" fill="#374151" stroke="#1F2937" strokeWidth="1"/>
    <circle cx="36" cy="34" r="1.5" fill="#6B7280"/>
    
    {/* Headlights */}
    <circle cx="8" cy="16" r="1" fill="#FEF3C7"/>
    <circle cx="40" cy="16" r="1" fill="#FEF3C7"/>
    
    {/* Side Mirrors */}
    <rect x="2" y="16" width="2" height="4" rx="1" fill="#6B7280"/>
    <rect x="44" y="16" width="2" height="4" rx="1" fill="#6B7280"/>
    
    {/* Bus Number/Logo Area */}
    <rect x="28" y="16" width="8" height="3" rx="0.5" fill="#FEF3C7" opacity="0.8"/>
    <text x="32" y="18" textAnchor="middle" fontSize="2" fill="#1F2937" fontFamily="Arial, sans-serif">GU</text>
  </svg>
);

const MapIcon = () => (
  <svg className="w-12 h-12 sm:w-16 sm:h-16" viewBox="0 0 48 48" fill="none">
    {/* Map Background */}
    <rect x="4" y="8" width="40" height="32" rx="2" fill="#F0FDF4" stroke="#16A34A" strokeWidth="1"/>
    
    {/* Map Grid Lines */}
    <line x1="8" y1="16" x2="40" y2="16" stroke="#BBF7D0" strokeWidth="0.5"/>
    <line x1="8" y1="24" x2="40" y2="24" stroke="#BBF7D0" strokeWidth="0.5"/>
    <line x1="8" y1="32" x2="40" y2="32" stroke="#BBF7D0" strokeWidth="0.5"/>
    <line x1="16" y1="12" x2="16" y2="36" stroke="#BBF7D0" strokeWidth="0.5"/>
    <line x1="24" y1="12" x2="24" y2="36" stroke="#BBF7D0" strokeWidth="0.5"/>
    <line x1="32" y1="12" x2="32" y2="36" stroke="#BBF7D0" strokeWidth="0.5"/>
    
    {/* Roads */}
    <rect x="12" y="20" width="16" height="2" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="0.5"/>
    <rect x="20" y="12" width="2" height="16" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="0.5"/>
    
    {/* Buildings */}
    <rect x="10" y="26" width="4" height="8" fill="#E5E7EB" stroke="#6B7280" strokeWidth="0.5"/>
    <rect x="16" y="28" width="4" height="6" fill="#E5E7EB" stroke="#6B7280" strokeWidth="0.5"/>
    <rect x="22" y="26" width="4" height="8" fill="#E5E7EB" stroke="#6B7280" strokeWidth="0.5"/>
    <rect x="28" y="28" width="4" height="6" fill="#E5E7EB" stroke="#6B7280" strokeWidth="0.5"/>
    <rect x="34" y="26" width="4" height="8" fill="#E5E7EB" stroke="#6B7280" strokeWidth="0.5"/>
    
    {/* Windows on Buildings */}
    <rect x="11" y="28" width="1" height="1" fill="#3B82F6"/>
    <rect x="13" y="28" width="1" height="1" fill="#3B82F6"/>
    <rect x="17" y="30" width="1" height="1" fill="#3B82F6"/>
    <rect x="19" y="30" width="1" height="1" fill="#3B82F6"/>
    <rect x="23" y="28" width="1" height="1" fill="#3B82F6"/>
    <rect x="25" y="28" width="1" height="1" fill="#3B82F6"/>
    <rect x="29" y="30" width="1" height="1" fill="#3B82F6"/>
    <rect x="31" y="30" width="1" height="1" fill="#3B82F6"/>
    <rect x="35" y="28" width="1" height="1" fill="#3B82F6"/>
    <rect x="37" y="28" width="1" height="1" fill="#3B82F6"/>
    
    {/* Location Pin */}
    <circle cx="24" cy="22" r="2" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5"/>
    <path d="M24 24 L26 28 L22 28 Z" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5"/>
    <circle cx="24" cy="22" r="0.5" fill="#FFFFFF"/>
    
    {/* Compass Rose */}
    <circle cx="36" cy="16" r="3" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="0.5"/>
    <text x="36" y="18" textAnchor="middle" fontSize="2" fill="#1F2937" fontFamily="Arial, sans-serif">N</text>
    <text x="36" y="22" textAnchor="middle" fontSize="2" fill="#1F2937" fontFamily="Arial, sans-serif">S</text>
    <text x="33" y="20" textAnchor="middle" fontSize="2" fill="#1F2937" fontFamily="Arial, sans-serif">W</text>
    <text x="39" y="20" textAnchor="middle" fontSize="2" fill="#1F2937" fontFamily="Arial, sans-serif">E</text>
  </svg>
);

const AdminIcon = () => (
  <svg className="w-12 h-12 sm:w-16 sm:h-16" viewBox="0 0 48 48" fill="none">
    {/* Dashboard Background */}
    <rect x="4" y="8" width="40" height="32" rx="3" fill="#F8FAFC" stroke="#8B5CF6" strokeWidth="1"/>
    
    {/* Header Bar */}
    <rect x="6" y="10" width="36" height="4" rx="1" fill="#8B5CF6" opacity="0.8"/>
    <circle cx="8" cy="12" r="1" fill="#FFFFFF"/>
    <circle cx="10" cy="12" r="1" fill="#FFFFFF"/>
    <circle cx="12" cy="12" r="1" fill="#FFFFFF"/>
    
    {/* Sidebar */}
    <rect x="6" y="16" width="8" height="20" rx="1" fill="#E9D5FF" stroke="#A855F7" strokeWidth="0.5"/>
    
    {/* Sidebar Icons */}
    <rect x="8" y="18" width="4" height="2" rx="0.5" fill="#7C3AED"/>
    <rect x="8" y="22" width="4" height="2" rx="0.5" fill="#7C3AED"/>
    <rect x="8" y="26" width="4" height="2" rx="0.5" fill="#7C3AED"/>
    <rect x="8" y="30" width="4" height="2" rx="0.5" fill="#7C3AED"/>
    
    {/* Main Content Area */}
    <rect x="16" y="16" width="26" height="20" rx="1" fill="#FFFFFF" stroke="#DDD6FE" strokeWidth="0.5"/>
    
    {/* Content Grid */}
    <rect x="18" y="18" width="10" height="6" rx="1" fill="#F3E8FF" stroke="#C084FC" strokeWidth="0.5"/>
    <rect x="30" y="18" width="10" height="6" rx="1" fill="#F3E8FF" stroke="#C084FC" strokeWidth="0.5"/>
    <rect x="18" y="26" width="10" height="8" rx="1" fill="#F3E8FF" stroke="#C084FC" strokeWidth="0.5"/>
    <rect x="30" y="26" width="10" height="8" rx="1" fill="#F3E8FF" stroke="#C084FC" strokeWidth="0.5"/>
    
    {/* Chart Lines */}
    <path d="M20 22 L22 21 L24 23 L26 20 L28 22" stroke="#8B5CF6" strokeWidth="1" fill="none"/>
    <path d="M32 22 L34 21 L36 23 L38 20 L40 22" stroke="#8B5CF6" strokeWidth="1" fill="none"/>
    
    {/* Data Points */}
    <circle cx="20" cy="22" r="0.5" fill="#8B5CF6"/>
    <circle cx="22" cy="21" r="0.5" fill="#8B5CF6"/>
    <circle cx="24" cy="23" r="0.5" fill="#8B5CF6"/>
    <circle cx="26" cy="20" r="0.5" fill="#8B5CF6"/>
    <circle cx="28" cy="22" r="0.5" fill="#8B5CF6"/>
    <circle cx="32" cy="22" r="0.5" fill="#8B5CF6"/>
    <circle cx="34" cy="21" r="0.5" fill="#8B5CF6"/>
    <circle cx="36" cy="23" r="0.5" fill="#8B5CF6"/>
    <circle cx="38" cy="20" r="0.5" fill="#8B5CF6"/>
    <circle cx="40" cy="22" r="0.5" fill="#8B5CF6"/>
    
    {/* Bar Chart */}
    <rect x="20" y="30" width="2" height="2" fill="#8B5CF6"/>
    <rect x="23" y="29" width="2" height="3" fill="#8B5CF6"/>
    <rect x="26" y="28" width="2" height="4" fill="#8B5CF6"/>
    <rect x="29" y="31" width="2" height="1" fill="#8B5CF6"/>
    <rect x="32" y="30" width="2" height="2" fill="#8B5CF6"/>
    <rect x="35" y="29" width="2" height="3" fill="#8B5CF6"/>
    <rect x="38" y="28" width="2" height="4" fill="#8B5CF6"/>
    
    {/* Settings Gear */}
    <circle cx="40" cy="12" r="2" fill="#8B5CF6" stroke="#7C3AED" strokeWidth="0.5"/>
    <circle cx="40" cy="12" r="1" fill="#FFFFFF"/>
    <path d="M40 10 L40 8 M40 16 L40 14 M46 12 L44 12 M36 12 L34 12" stroke="#7C3AED" strokeWidth="0.5" strokeLinecap="round"/>
  </svg>
);

const PremiumHomepage: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);



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

  // Optimize particle count for mobile
  const particleCount = isMobile ? 8 : 20;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        {/* Premium Heading */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-16 px-4"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-2 sm:mb-4 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Ganpat University
            </span>
          </h1>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Bus Tracker
          </h2>
          <div className="w-20 sm:w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full" />
        </motion.div>

        {/* Interactive Buttons Container */}
        <StaggerContainer className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-12 items-center justify-center w-full max-w-6xl px-4">
          {/* Driver Interface Button */}
          <StaggerItem>
            <motion.div
              whileHover={
                !isMobile ? { scale: 1.05, rotateY: 5, rotateX: 2 } : {}
              }
              whileTap={{ scale: 0.95 }}
              className="relative group w-full sm:w-auto"
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <GlassyCard
                variant="ultra"
                glow={true}
                className="w-full sm:w-72 md:w-80 h-40 sm:h-48 flex flex-col items-center justify-center cursor-pointer relative z-10"
                onClick={() => handleNavigation('/driver-login')}
              >
                <div className="text-center px-2">
                  <div className="mb-2 sm:mb-4 animate-pulse">
                    <BusIcon />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">
                    Driver Interface
                  </h3>
                  <p className="text-white/70 text-xs sm:text-sm">
                    Real-time location sharing & navigation
                  </p>
                </div>

                {/* Hover/Touch Indicator */}
                <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              </GlassyCard>
            </motion.div>
          </StaggerItem>

          {/* Student Map Button */}
          <StaggerItem>
            <motion.div
              whileHover={
                !isMobile ? { scale: 1.05, rotateY: 5, rotateX: 2 } : {}
              }
              whileTap={{ scale: 0.95 }}
              className="relative group w-full sm:w-auto"
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-blue-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <GlassyCard
                variant="ultra"
                glow={true}
                className="w-full sm:w-72 md:w-80 h-40 sm:h-48 flex flex-col items-center justify-center cursor-pointer relative z-10"
                onClick={() => handleNavigation('/student-map')}
              >
                <div className="text-center px-2">
                  <div className="mb-2 sm:mb-4 animate-pulse">
                    <MapIcon />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">
                    Student Map
                  </h3>
                  <p className="text-white/70 text-xs sm:text-sm">
                    Live bus tracking & route information
                  </p>
                </div>

                {/* Hover/Touch Indicator */}
                <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              </GlassyCard>
            </motion.div>
          </StaggerItem>

          {/* Admin Panel Button */}
          <StaggerItem>
            <motion.div
              whileHover={
                !isMobile ? { scale: 1.05, rotateY: 5, rotateX: 2 } : {}
              }
              whileTap={{ scale: 0.95 }}
              className="relative group w-full sm:w-auto"
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <GlassyCard
                variant="ultra"
                glow={true}
                className="w-full sm:w-72 md:w-80 h-40 sm:h-48 flex flex-col items-center justify-center cursor-pointer relative z-10"
                onClick={() => handleNavigation('/admin-login')}
              >
                <div className="text-center px-2">
                  <div className="mb-2 sm:mb-4 animate-pulse">
                    <AdminIcon />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">
                    Admin Panel
                  </h3>
                  <p className="text-white/70 text-xs sm:text-sm">
                    Fleet management & analytics dashboard
                  </p>
                </div>

                {/* Hover/Touch Indicator */}
                <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              </GlassyCard>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 text-center px-4"
        >
          <p className="text-white/60 text-xs sm:text-sm">
            Powered by cutting-edge technology • Real-time tracking • Premium
            experience
          </p>
        </motion.div>

        {/* Floating Particles Effect - Optimized for mobile */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(particleCount)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -50, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PremiumHomepage;
