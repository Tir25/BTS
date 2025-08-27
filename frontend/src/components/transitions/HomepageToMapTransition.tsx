import React from 'react';
import { motion } from 'framer-motion';

interface HomepageToMapTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
}

export const HomepageToMapTransition: React.FC<
  HomepageToMapTransitionProps
> = ({ children, isVisible }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.8,
      }}
      transition={{
        duration: 1.2,
        ease: 'easeInOut',
      }}
      className="w-full h-full"
    >
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          y: isVisible ? 0 : 100,
        }}
        transition={{
          duration: 0.8,
          delay: 0.3,
          ease: 'easeOut',
        }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
