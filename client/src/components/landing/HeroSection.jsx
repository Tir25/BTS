/**
 * HeroSection Component
 * Main hero area with headline, CTA, phone mockup, and PWA install button
 * Single responsibility: Hero content and layout
 */
import { Link } from 'react-router-dom';
import { Button, LogoIcon, Icon } from '@/components/ui';
import { usePWAInstall } from '@/hooks';
import { AnimatedBackground } from './AnimatedBackground';
import { Download, Smartphone, CheckCircle } from 'lucide-react';
import './HeroSection.css';

/**
 * @param {React.ReactNode} mockup - Phone mockup component
 */
export function HeroSection({ mockup }) {
    const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

    return (
        <section className="hero-section">
            <AnimatedBackground />

            <div className="hero-container">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Track Your Campus Bus
                        <span className="hero-highlight"> in Real-Time</span>
                    </h1>

                    <p className="hero-description">
                        Know exactly when your bus arrives. Never miss a ride again
                        with live GPS tracking, ETA updates, and route information.
                    </p>

                    <div className="hero-cta">
                        <Link to="/login">
                            <Button size="lg">
                                Get Started
                                <Icon name="arrowRight" size="sm" className="cta-arrow" />
                            </Button>
                        </Link>
                        <Link to="/track">
                            <Button variant="secondary" size="lg">
                                View Live Map
                            </Button>
                        </Link>
                    </div>

                    {/* PWA Install Button */}
                    {isInstalled ? (
                        <div className="pwa-installed-badge">
                            <CheckCircle size={16} />
                            <span>App Installed</span>
                        </div>
                    ) : isInstallable ? (
                        <button className="pwa-install-btn" onClick={promptInstall}>
                            <Download size={18} />
                            <span>Install App</span>
                            <Smartphone size={16} />
                        </button>
                    ) : (
                        <p className="pwa-hint">
                            <Smartphone size={14} />
                            <span>Open in Chrome to install as app</span>
                        </p>
                    )}

                    <p className="hero-trust">
                        <Icon name="shield" size="xs" />
                        <span>Trusted by Ganpat University students & faculty</span>
                    </p>
                </div>

                <div className="hero-mockup">
                    {mockup}
                </div>
            </div>
        </section>
    );
}

export default HeroSection;
