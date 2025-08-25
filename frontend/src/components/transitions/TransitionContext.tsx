import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type TransitionType =
  | 'homepage-to-login'
  | 'homepage-to-map'
  | 'login-to-dashboard'
  | 'default';

interface TransitionContextType {
  currentTransition: TransitionType;
  setTransition: (transition: TransitionType) => void;
}

const TransitionContext = createContext<TransitionContextType | undefined>(
  undefined
);

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
};

interface TransitionProviderProps {
  children: React.ReactNode;
}

export const TransitionProvider: React.FC<TransitionProviderProps> = ({
  children,
}) => {
  const [currentTransition, setCurrentTransition] =
    useState<TransitionType>('default');
  const { pathname } = useLocation();

  useEffect(() => {
    // Determine transition based on route changes
    if (
      pathname === '/' &&
      (pathname.includes('login') ||
        pathname.includes('admin-login') ||
        pathname.includes('driver-login'))
    ) {
      setCurrentTransition('homepage-to-login');
    } else if (
      pathname === '/' &&
      (pathname.includes('student') || pathname.includes('student-map'))
    ) {
      setCurrentTransition('homepage-to-map');
    } else if (
      (pathname.includes('login') ||
        pathname.includes('admin-login') ||
        pathname.includes('driver-login')) &&
      (pathname.includes('dashboard') ||
        pathname.includes('admin') ||
        pathname.includes('driver-dashboard'))
    ) {
      setCurrentTransition('login-to-dashboard');
    } else {
      setCurrentTransition('default');
    }
  }, [pathname]);

  const setTransition = (transition: TransitionType) => {
    setCurrentTransition(transition);
  };

  return (
    <TransitionContext.Provider value={{ currentTransition, setTransition }}>
      {children}
    </TransitionContext.Provider>
  );
};

