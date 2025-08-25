import React from 'react';
import { motion } from 'framer-motion';

interface HomepageToLoginTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
}

export const HomepageToLoginTransition: React.FC<
  HomepageToLoginTransitionProps
> = ({ children, isVisible }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 50,
      }}
      transition={{
        duration: 0.8,
        ease: 'easeInOut',
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};
