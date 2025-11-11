import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentMap from './StudentMap';
import { studentAuthService } from '../services/auth/studentAuthService';
import { useAuthStore } from '../stores/useAuthStore';
import { logger } from '../utils/logger';

/**
 * StudentMapWrapper - Authentication wrapper for student map
 * Requires student authentication to access the map
 */
const StudentMapWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { user, isStudent, setUser } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if student is authenticated
        const isAuthenticated = studentAuthService.isAuthenticated();
        const currentUser = studentAuthService.getCurrentUser();
        const currentProfile = studentAuthService.getCurrentProfile();
        
        if (!isAuthenticated || !currentUser || !currentProfile) {
          logger.info('🔄 Student not authenticated, redirecting to login', 'component');
          navigate('/student-login', { replace: true });
          return;
        }

        // Verify user is a student
        if (currentProfile.role !== 'student') {
          logger.warn('⚠️ User is not a student, redirecting to login', 'component', {
            role: currentProfile.role
          });
          navigate('/student-login', { replace: true });
          return;
        }

        // Update auth store if needed
        if (!user || user.id !== currentUser.id) {
          useAuthStore.getState().setUser({
            id: currentProfile.id,
            email: currentProfile.email,
            role: currentProfile.role as 'student',
            full_name: currentProfile.full_name,
            created_at: currentProfile.created_at,
            updated_at: currentProfile.updated_at,
          });
        }

        setIsCheckingAuth(false);
      } catch (error) {
        logger.error('❌ Auth check error', 'component', { error });
        navigate('/student-login', { replace: true });
      }
    };

    checkAuthentication();
  }, [navigate, user]);

  // Handle student logout
  const handleSignOut = useCallback(async () => {
    // Prevent multiple simultaneous sign out attempts
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      logger.info('🔐 Starting student sign out process...', 'student-map-wrapper');
      
      // Call student auth service sign out
      const result = await studentAuthService.signOut();
      
      // Clear auth store
      setUser(null);
      
      // Helper function to ensure navigation happens reliably
      const performNavigation = () => {
        try {
          // Try React Router navigation first (non-blocking)
          navigate('/student-login', { replace: true });
        } catch (navError) {
          logger.error('❌ React Router navigation error', 'student-map-wrapper', { error: String(navError) });
        }
        
        // Always use window.location as a reliable fallback after a short delay
        // This ensures navigation happens even if React Router is blocked
        setTimeout(() => {
          // Use replace instead of href to prevent back button issues
          window.location.replace('/student-login');
        }, 300);
      };
      
      if (result.success) {
        logger.info('✅ Student sign out successful, redirecting to login', 'student-map-wrapper');
        performNavigation();
      } else {
        // Sign out returned an error, but still redirect
        logger.warn('⚠️ Student sign out had an error, but continuing with redirect', 'student-map-wrapper', { 
          error: result.error 
        });
        performNavigation();
      }
    } catch (error) {
      logger.error('❌ Student sign out error', 'student-map-wrapper', { error: String(error) });
      // Even on error, try to redirect
      setUser(null);
      setTimeout(() => {
        window.location.replace('/student-login');
      }, 300);
    } finally {
      setIsSigningOut(false);
    }
  }, [navigate, setUser, isSigningOut]);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <StudentMap onSignOut={handleSignOut} />
    </div>
  );
};

export default StudentMapWrapper;






