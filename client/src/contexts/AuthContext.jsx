import { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';

const AuthContext = createContext(null);

/**
 * Authentication Provider
 * Handles user auth state and role-based access
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // Get user role from Firestore
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userData });
                        setUserRole(userData.role);
                    } else {
                        // User exists in Auth but not Firestore (shouldn't happen normally)
                        setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
                        setUserRole(null);
                    }
                } else {
                    setUser(null);
                    setUserRole(null);
                }
            } catch (err) {
                console.error('Auth state error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Sign in with email and password
    const signIn = async (email, password) => {
        setError(null);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const value = {
        user,
        userRole,
        loading,
        error,
        signIn,
        signOut,
        isAuthenticated: !!user,
        isAdmin: userRole === 'admin',
        isDriver: userRole === 'driver',
        isStudent: userRole === 'student' || userRole === 'faculty'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to access auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
