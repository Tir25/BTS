import React from 'react';
import { motion } from 'framer-motion';

interface LoginToHomepageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
}

export const LoginToHomepageTransition: React.FC<
  LoginToHomepageTransitionProps
> = ({ children, isVisible }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.8,
      }}
      transition={{
        duration: 0.6,
        ease: 'easeInOut',
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};
