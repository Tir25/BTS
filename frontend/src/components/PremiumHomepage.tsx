import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StaggerContainer, StaggerItem } from './PageTransition';
import GlassyCard from './ui/GlassyCard';
import { useTransition } from './transitions';

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
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: particleCount }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full"
              animate={{
                x: [0, Math.random() * window.innerWidth],
                y: [0, Math.random() * window.innerHeight],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: 'linear',
                delay: Math.random() * 5,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      </div>

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
                  <div className="text-4xl sm:text-6xl mb-2 sm:mb-4 animate-pulse">
                    🚌
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
                  <div className="text-4xl sm:text-6xl mb-2 sm:mb-4 animate-pulse">
                    🗺️
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
                  <div className="text-4xl sm:text-6xl mb-2 sm:mb-4 animate-pulse">
                    ⚙️
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
