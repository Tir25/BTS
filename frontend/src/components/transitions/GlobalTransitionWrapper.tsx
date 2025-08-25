import React from 'react';
import { useTransition } from './TransitionContext';
import { HomepageToLoginTransition } from './HomepageToLoginTransition';
import { HomepageToMapTransition } from './HomepageToMapTransition';
import { LoginToDashboardTransition } from './LoginToDashboardTransition';

interface GlobalTransitionWrapperProps {
  children: React.ReactNode;
}

export const GlobalTransitionWrapper: React.FC<
  GlobalTransitionWrapperProps
> = ({ children }) => {
  const { currentTransition } = useTransition();

  // Determine which transition to show based on current transition type
  const renderTransition = () => {
    switch (currentTransition) {
      case 'homepage-to-login':
        return (
          <HomepageToLoginTransition isVisible={true}>
            {children}
          </HomepageToLoginTransition>
        );
      case 'homepage-to-map':
        return (
          <HomepageToMapTransition isVisible={true}>
            {children}
          </HomepageToMapTransition>
        );
      case 'login-to-dashboard':
        return (
          <LoginToDashboardTransition isVisible={true}>
            {children}
          </LoginToDashboardTransition>
        );
      default:
        return children;
    }
  };

  return <>{renderTransition()}</>;
};
