import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StaggerContainer, StaggerItem } from './PageTransition';
import GlassyCard from './ui/GlassyCard';
import { useTransition } from './transitions';

const PremiumHomepage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [videoLoadingTimeout, setVideoLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Slow down the video slightly

      // Handle video loading
      const handleVideoLoad = () => {
        console.log('Video loaded successfully');
        setIsVideoLoaded(true);
        if (videoLoadingTimeout) {
          clearTimeout(videoLoadingTimeout);
        }
      };
      
      const handleVideoError = (e: Event) => {
        console.error('Video loading error:', e);
        setIsVideoError(true);
        setIsVideoLoaded(true); // Remove loading state even on error
        if (videoLoadingTimeout) {
          clearTimeout(videoLoadingTimeout);
        }
      };

      const handleVideoCanPlay = () => {
        console.log('Video can play');
        setIsVideoLoaded(true);
        if (videoLoadingTimeout) {
          clearTimeout(videoLoadingTimeout);
        }
      };
      
      videoRef.current.addEventListener('loadeddata', handleVideoLoad);
      videoRef.current.addEventListener('error', handleVideoError);
      videoRef.current.addEventListener('canplay', handleVideoCanPlay);

      // Set a timeout to remove loading state if video takes too long
      const timeout = setTimeout(() => {
        console.log('Video loading timeout - removing loading state');
        setIsVideoLoaded(true);
        setIsVideoError(true); // Treat timeout as error
      }, 5000); // 5 second timeout

      setVideoLoadingTimeout(timeout);

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleVideoLoad);
          videoRef.current.removeEventListener('error', handleVideoError);
          videoRef.current.removeEventListener('canplay', handleVideoCanPlay);
        }
        if (videoLoadingTimeout) {
          clearTimeout(videoLoadingTimeout);
        }
      };
    }
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
    
    // Add a small delay for smooth transition
    setTimeout(() => {
      navigate(path);
    }, 200);
  };

  // Optimize particle count for mobile
  const particleCount = isMobile ? 8 : 20;

  return (
    <div className="relative min-h-screen overflow-hidden netlify-drawer-fix">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        {!isVideoError ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="video-background video-autoplay"
            preload="auto"
            poster="/videos/background-video.mp4"
          >
            <source src="/videos/background-video.mp4" type="video/mp4" />
            <source src="/videos/Animated_Countryside_University_Bus.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="video-background asset-fallback" />
        )}

        {/* Video overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        {/* Loading overlay */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="loading-spinner" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-content flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        {/* Premium Heading */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-16 px-4"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-4 font-inter text-visible">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Ganpat University
            </span>
          </h1>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-6 text-visible">
            Bus Tracker
          </h2>
          
          {/* Loading indicator - only show if video is still loading */}
          {!isVideoLoaded && (
            <div className="flex justify-center mb-8">
              <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Feature Cards */}
        <StaggerContainer className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
            {/* Driver Interface Card */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="touch-target"
              >
                <GlassyCard
                  onClick={() => handleNavigation('/driver-login')}
                  className="glass-card btn-hover cursor-pointer h-full p-6 sm:p-8 text-center group"
                >
                  <div className="card-icon-wrapper bg-gradient-to-br from-yellow-400 to-blue-500 group-hover:scale-110 animate-smooth">
                    <div className="icon-container">
                      <svg className="icon-svg text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 text-visible">
                    Driver Interface
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base mobile-text">
                    Real-time location sharing & navigation
                  </p>
                </GlassyCard>
              </motion.div>
            </StaggerItem>

            {/* Student Map Card */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="touch-target"
              >
                <GlassyCard
                  onClick={() => handleNavigation('/student-map')}
                  className="glass-card btn-hover cursor-pointer h-full p-6 sm:p-8 text-center group"
                >
                  <div className="card-icon-wrapper bg-gradient-to-br from-blue-400 to-purple-500 group-hover:scale-110 animate-smooth">
                    <div className="icon-container">
                      <svg className="icon-svg text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 text-visible">
                    Student Map
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base mobile-text">
                    Live bus tracking & route information
                  </p>
                </GlassyCard>
              </motion.div>
            </StaggerItem>

            {/* Admin Panel Card */}
            <StaggerItem>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="touch-target"
              >
                <GlassyCard
                  onClick={() => handleNavigation('/admin-login')}
                  className="glass-card btn-hover cursor-pointer h-full p-6 sm:p-8 text-center group"
                >
                  <div className="card-icon-wrapper bg-gradient-to-br from-gray-500 to-gray-700 group-hover:scale-110 animate-smooth">
                    <div className="icon-container">
                      <svg className="icon-svg text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 text-visible">
                    Admin Panel
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base mobile-text">
                    Fleet management & analytics dashboard
                  </p>
                </GlassyCard>
              </motion.div>
            </StaggerItem>
          </div>
        </StaggerContainer>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-12 sm:mt-16 text-center"
        >
          <p className="text-gray-400 text-sm mobile-text">
            Powered by cutting-edge technology • Real-time tracking • Premium experience
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
