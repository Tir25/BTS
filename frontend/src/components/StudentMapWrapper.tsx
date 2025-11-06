import React from 'react';
import StudentMap from './StudentMap';

/**
 * StudentMapWrapper - PRODUCTION FIX: Removed authentication requirement
 * Students can now access the map directly without login
 */
const StudentMapWrapper: React.FC = () => {
  // PRODUCTION FIX: Clear any existing student auth data from localStorage
  // This ensures clean state and removes legacy authentication artifacts
  React.useEffect(() => {
    try {
      localStorage.removeItem('student_temp_auth');
    } catch (error) {
      // Ignore localStorage errors
    }
  }, []);

  // Directly render StudentMap without authentication check
  return (
    <div className="relative min-h-screen">
      <StudentMap />
    </div>
  );
};

export default StudentMapWrapper;






