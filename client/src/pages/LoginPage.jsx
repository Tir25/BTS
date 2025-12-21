import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRedirectPath } from '@/components/auth';
import { Button, Input, Card, CardBody } from '@/components/ui';
import './LoginPage.css';

/**
 * Login Page - unified login for all user roles
 */
export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signIn, userRole } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            // Auth state listener will update userRole, then redirect
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    // Redirect if already logged in with role (use effect to avoid render-time navigation)
    useEffect(() => {
        if (userRole) {
            navigate(getRedirectPath(userRole), { replace: true });
        }
    }, [userRole, navigate]);

    // Don't render form if redirecting
    if (userRole) {
        return null;
    }

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Logo */}
                <Link to="/" className="login-logo">
                    <span className="logo-icon">🚌</span>
                    <span className="logo-text">UniTrack</span>
                </Link>

                {/* Login Card */}
                <Card variant="elevated" className="login-card">
                    <CardBody>
                        <h1 className="login-title">Welcome Back</h1>
                        <p className="login-subtitle">Sign in to continue</p>

                        {error && (
                            <div className="login-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-form">
                            <Input
                                label="Email"
                                type="email"
                                placeholder="you@university.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />

                            <Input
                                label="Password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />

                            <Button
                                type="submit"
                                fullWidth
                                loading={loading}
                            >
                                Sign In
                            </Button>
                        </form>

                        <div className="login-footer">
                            <Link to="/forgot-password" className="login-link">
                                Forgot password?
                            </Link>
                        </div>
                    </CardBody>
                </Card>

                <p className="login-help">
                    Don't have an account? Contact your administrator.
                </p>
            </div>
        </div>
    );
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getErrorMessage(code) {
    const messages = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many attempts. Try again later',
        'auth/invalid-credential': 'Invalid email or password'
    };
    return messages[code] || 'Something went wrong. Please try again.';
}

export default LoginPage;
