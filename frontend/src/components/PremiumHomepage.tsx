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
      // Set video properties
      videoRef.current.playbackRate = 0.8;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;

      // Handle video loading
      const handleVideoLoad = () => {
        console.log('✅ Video loaded successfully');
        setIsVideoLoaded(true);
      };
      
      const handleVideoError = (e: Event) => {
        console.error('❌ Video loading error:', e);
        console.log('🔄 Falling back to gradient background');
        setIsVideoError(true);
        setIsVideoLoaded(true); // Remove loading state immediately on error
      };

      const handleVideoCanPlay = () => {
        console.log('✅ Video can play');
        setIsVideoLoaded(true);
      };

      // Add event listeners
      videoRef.current.addEventListener('loadeddata', handleVideoLoad);
      videoRef.current.addEventListener('error', handleVideoError);
      videoRef.current.addEventListener('canplay', handleVideoCanPlay);

      // Set a timeout to remove loading state if video takes too long
      const timeout = setTimeout(() => {
        console.log('⏰ Video loading timeout - falling back to gradient');
        setIsVideoLoaded(true);
        setIsVideoError(true); // Treat timeout as error
      }, 1500); // 1.5 second timeout - even faster fallback

      // Try to play the video
      const playVideo = async () => {
        try {
          console.log('🎬 Attempting to play video...');
          await videoRef.current?.play();
          console.log('✅ Video autoplay successful');
        } catch (error) {
          console.log('⚠️ Autoplay failed, but video will play on user interaction');
        }
      };

      playVideo();

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleVideoLoad);
          videoRef.current.removeEventListener('error', handleVideoError);
          videoRef.current.removeEventListener('canplay', handleVideoCanPlay);
        }
        clearTimeout(timeout);
      };
    } else {
      // If no video ref, remove loading state immediately
      console.log('⚠️ No video ref available - using gradient background');
      setIsVideoLoaded(true);
      setIsVideoError(true);
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
                <div className="text-center px-2 flex flex-col items-center justify-center h-full">
                  <div className="card-icon-wrapper mb-2 sm:mb-4">
                    <span className="text-4xl sm:text-6xl animate-pulse flex items-center justify-center">
                      🚌
                    </span>
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
                <div className="text-center px-2 flex flex-col items-center justify-center h-full">
                  <div className="card-icon-wrapper mb-2 sm:mb-4">
                    <span className="text-4xl sm:text-6xl animate-pulse flex items-center justify-center">
                      🗺️
                    </span>
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
                <div className="text-center px-2 flex flex-col items-center justify-center h-full">
                  <div className="card-icon-wrapper mb-2 sm:mb-4">
                    <span className="text-4xl sm:text-6xl animate-pulse flex items-center justify-center">
                      ⚙️
                    </span>
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
      </div>
    </div>
  );
};

export default PremiumHomepage;
