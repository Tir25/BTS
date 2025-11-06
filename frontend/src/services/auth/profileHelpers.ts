import { User } from '@supabase/supabase-js';
import { UserProfile } from '../../types';
import { supabase } from '../../config/supabase';
import { timeoutConfig } from '../../config/timeoutConfig';
import { logger } from '../../utils/logger';
import { resilientQuery } from '../resilience/ResilientSupabaseService';

/**
 * Profile loading helpers
 * Handles user profile loading with role detection and fallback strategies
 */
export class ProfileHelpers {
  /**
   * Get admin emails from environment
   */
  private getAdminEmails(): string[] {
    // PRODUCTION FIX: Removed hardcoded admin email
    // Admin emails must be configured via VITE_ADMIN_EMAILS environment variable
    const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map(
      (email: string) => email.trim().toLowerCase()
    ) || [];
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails configured. Set VITE_ADMIN_EMAILS environment variable.');
    }
    
    return adminEmails;
  }

  /**
   * Determine role for dual-role users
   */
  private determineRoleForDualUser(user: User | null): 'admin' | 'driver' | 'student' {
    const currentPath = window.location.pathname;
    let role: 'admin' | 'driver' | 'student' = 'admin'; // Default to admin

    if (currentPath.includes('/driver')) {
      role = 'driver';
    } else if (currentPath.includes('/admin')) {
      role = 'admin';
    } else {
      // If not on a specific interface, check if admin email
      const adminEmails = this.getAdminEmails();
      role = adminEmails.includes(user?.email?.toLowerCase() || '')
        ? 'admin'
        : 'driver';
    }
    return role;
  }

  /**
   * Check if user is admin based on email
   */
  private isAdminEmail(email: string | undefined): boolean {
    if (!email) return false;
    const adminEmails = this.getAdminEmails();
    return adminEmails.includes(email.toLowerCase());
  }

  /**
   * Load user profile from database
   * PRODUCTION FIX: Always returns a profile, never null
   */
  async loadUserProfile(
    userId: string,
    currentUser: User | null
  ): Promise<UserProfile> {
    try {
      // Check if user has dual roles in auth metadata
      const authRoles = currentUser?.user_metadata?.roles;
      const isDualRoleUser =
        authRoles && Array.isArray(authRoles) && authRoles.length > 1;

      if (isDualRoleUser) {
        // For dual-role users, determine role based on current interface
        const role = this.determineRoleForDualUser(currentUser);

        const result = await resilientQuery<{
          id: string;
          full_name: string;
          role: string;
          created_at: string;
          updated_at: string;
        }>(
          async () => {
            const queryResult = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', userId)
              .single();
            return queryResult;
          },
          {
            timeout: timeoutConfig.api.default,
            retryOnFailure: true,
            maxRetries: 3,
          }
        );

        if (result.error || !result.data) {
          logger.warn('⚠️ Error loading user profile, using temporary profile', 'auth', {
            error: result.error?.message || 'No data returned',
            retries: result.retries || 0,
          });
          return await this.createTemporaryProfile(userId, currentUser);
        }

        const profile = result.data;
      const userProfile: UserProfile = {
        id: profile.id,
        email: currentUser?.email || '',
        role: role, // Use determined role instead of database role
        full_name: profile.full_name,
        first_name: profile.full_name?.split(' ')[0] || '',
        last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
      
      // PRODUCTION FIX: Cache the profile
      try {
        localStorage.setItem(`profile_${profile.id}`, JSON.stringify({
          ...userProfile,
          _timestamp: Date.now()
        }));
      } catch (cacheError) {
        // Ignore cache errors
      }
      
      return userProfile;
      }

      // Regular single-role user handling
      const result = await resilientQuery<{
        id: string;
        full_name: string;
        role: string;
        created_at: string;
        updated_at: string;
      }>(
        async () => {
          const queryResult = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return queryResult;
        },
        {
          timeout: timeoutConfig.api.default,
          retryOnFailure: true,
          maxRetries: 3,
        }
      );

      if (result.error || !result.data) {
        logger.warn('⚠️ Error loading user profile, using temporary profile', 'auth', {
          error: result.error?.message || 'No data returned',
          retries: result.retries || 0,
        });
        return await this.createTemporaryProfile(userId, currentUser);
      }

      const profile = result.data;

      // Check if this is a known admin user - prioritize admin email over database role
      const isAdmin = this.isAdminEmail(currentUser?.email);
      const role: 'admin' | 'driver' | 'student' = isAdmin ? 'admin' : (profile.role as 'admin' | 'driver' | 'student');

      logger.debug('User profile loaded', 'auth', {
        email: currentUser?.email,
        databaseRole: profile.role,
        adminCheck: isAdmin,
        finalRole: role,
      });

      const userProfile: UserProfile = {
        id: profile.id,
        email: currentUser?.email || '',
        role: role,
        full_name: profile.full_name,
        first_name: profile.full_name?.split(' ')[0] || '',
        last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
      
      // PRODUCTION FIX: Cache the profile
      try {
        localStorage.setItem(`profile_${profile.id}`, JSON.stringify({
          ...userProfile,
          _timestamp: Date.now()
        }));
      } catch (cacheError) {
        // Ignore cache errors
      }
      
      return userProfile;
    } catch (error) {
      logger.error('❌ Error in loadUserProfile', 'auth', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return await this.createTemporaryProfile(userId, currentUser);
    }
  }

  /**
   * Create temporary profile with role check
   * PRODUCTION FIX: Always returns a profile, never null
   */
  private async createTemporaryProfile(
    userId: string,
    user: User | null
  ): Promise<UserProfile> {
    logger.info('🔄 Setting temporary profile with database role lookup', 'auth', {
      userId,
      userEmail: user?.email
    });

    // PRODUCTION FIX: Always create a profile, even if user is null
    if (!user) {
      logger.warn('⚠️ No user data available, creating minimal profile', 'auth');
      return {
        id: userId,
        email: '',
        role: 'student',
        full_name: 'User',
        first_name: 'User',
        last_name: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    let actualRole: 'admin' | 'driver' | 'student' = 'student'; // Default fallback
    
    try {
      logger.info('🔍 Attempting to fetch actual user role from database', 'auth', { userId });
      
      const roleResult = await resilientQuery<{ role: string }>(
        async () => {
          const queryResult = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single();
          return queryResult;
        },
        {
          timeout: 3000,
          retryOnFailure: true,
          maxRetries: 2,
        }
      );
      
      if (roleResult.data?.role) {
        actualRole = roleResult.data.role as 'admin' | 'driver' | 'student';
        logger.info('✅ Successfully retrieved actual role from database', 'auth', {
          userId,
          actualRole,
          retries: roleResult.retries || 0
        });
      } else {
        logger.warn('⚠️ No role found in database, falling back to email-based role assignment', 'auth', {
          userId,
          error: roleResult.error?.message
        });
        
        // Fallback to email-based role assignment
        const isAdmin = this.isAdminEmail(user.email);
        actualRole = isAdmin ? 'admin' : 'student';
      }
    } catch (error) {
      logger.error('❌ Failed to fetch role from database, using email-based fallback', 'auth', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      
      // Final fallback to email-based role assignment
      const isAdmin = this.isAdminEmail(user.email);
      actualRole = isAdmin ? 'admin' : 'student';
    }

    logger.info(`🔍 User ${user.email} assigned role: ${actualRole}`, 'auth', {
      method: 'temporary_profile_with_role_check',
      wasFromDatabase: actualRole !== 'student' || !user.email?.includes('admin')
    });

    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const firstName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User';
    const lastName = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';

    const profile: UserProfile = {
      id: userId,
      email: user.email || '',
      role: actualRole,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
      logger.info('✅ Temporary profile created successfully', 'auth', {
        userId,
        role: actualRole,
        fullName
      });

      // PRODUCTION FIX: Cache the profile for faster future loads
      try {
        localStorage.setItem(`profile_${userId}`, JSON.stringify({
          ...profile,
          _timestamp: Date.now()
        }));
      } catch (cacheError) {
        // Ignore cache errors
      }

    // PRODUCTION FIX: Final guarantee - always return a profile
    return profile;
  }

  /**
   * Try to load cached profile
   */
  tryLoadCachedProfile(userId: string): UserProfile | null {
    try {
      const cachedProfile = localStorage.getItem(`profile_${userId}`);
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile);
        const cacheTime = parsedProfile._timestamp || 0;
        
        // Only use cache if it's less than 1 hour old
        if (Date.now() - cacheTime < 3600000) {
          logger.info('✅ Used cached profile data', 'auth');
          return {
            id: parsedProfile.id,
            email: parsedProfile.email,
            role: parsedProfile.role,
            full_name: parsedProfile.full_name,
            first_name: parsedProfile.first_name,
            last_name: parsedProfile.last_name,
            created_at: parsedProfile.created_at,
            updated_at: parsedProfile.updated_at,
          };
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  }
}

// Export singleton instance
export const profileHelpers = new ProfileHelpers();

