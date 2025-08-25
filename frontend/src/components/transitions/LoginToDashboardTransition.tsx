import React from 'react';
import { motion } from 'framer-motion';

interface LoginToDashboardTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
}

export const LoginToDashboardTransition: React.FC<
  LoginToDashboardTransitionProps
> = ({ children, isVisible }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.9,
      }}
      transition={{
        duration: 1.0,
        ease: 'easeInOut',
      }}
      className="w-full h-full"
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          y: isVisible ? 0 : 50,
        }}
        transition={{
          duration: 0.8,
          delay: 0.2,
          ease: 'easeOut',
        }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
