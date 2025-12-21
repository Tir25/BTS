import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import PhoneMockup from './PhoneMockup';
import './LandingPage.css';

/**
 * Landing Page with hero section and phone mockup
 */
export function LandingPage() {
    return (
        <div className="landing">
            {/* Header */}
            <header className="landing-header">
                <div className="landing-logo">
                    <span className="logo-icon">🚌</span>
                    <span className="logo-text">UniTrack</span>
                </div>
                <Link to="/login">
                    <Button variant="secondary" size="sm">Login</Button>
                </Link>
            </header>

            {/* Hero Section */}
            <main className="landing-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Track Your Campus Bus
                        <span className="hero-highlight"> in Real-Time</span>
                    </h1>
                    <p className="hero-description">
                        Know exactly when your bus arrives. Never miss a ride again
                        with live GPS tracking, ETA updates, and route information.
                    </p>
                    <Link to="/login">
                        <Button size="lg">
                            Get Started
                            <span className="btn-arrow">→</span>
                        </Button>
                    </Link>
                </div>

                <div className="hero-mockup">
                    <PhoneMockup />
                </div>
            </main>

            {/* Features Section */}
            <section className="landing-features">
                <div className="features-grid">
                    <FeatureCard
                        icon="📍"
                        title="Live Tracking"
                        description="See all buses on the map in real-time"
                    />
                    <FeatureCard
                        icon="⏱️"
                        title="ETA Updates"
                        description="Know exactly when the bus arrives at your stop"
                    />
                    <FeatureCard
                        icon="🗺️"
                        title="Route Info"
                        description="View all stops and routes at a glance"
                    />
                    <FeatureCard
                        icon="⭐"
                        title="Favorites"
                        description="Save your preferred routes for quick access"
                    />
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>© 2024 UniTrack. Built for university transportation.</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div className="feature-card glass-card">
            <span className="feature-icon">{icon}</span>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-description">{description}</p>
        </div>
    );
}

export default LandingPage;
