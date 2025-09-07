import React, { createContext, useState, useEffect } from 'react';
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

export const TransitionContext = createContext<
  TransitionContextType | undefined
>(undefined);

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
      pathname.includes('login') ||
      pathname.includes('admin-login') ||
      pathname.includes('driver-login')
    ) {
      setCurrentTransition('homepage-to-login');
    } else if (
      pathname.includes('student') ||
      pathname.includes('student-map')
    ) {
      setCurrentTransition('homepage-to-map');
    } else if (
      pathname.includes('dashboard') ||
      pathname.includes('admin') ||
      pathname.includes('driver-dashboard')
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
