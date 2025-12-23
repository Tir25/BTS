/**
 * LandingHeader Component
 * Top navigation with logo and login button
 * Single responsibility: Landing page header
 */
import { Link } from 'react-router-dom';
import { Button, LogoIcon } from '@/components/ui';
import './LandingHeader.css';

export function LandingHeader() {
    return (
        <header className="landing-header">
            <div className="header-container">
                <Link to="/" className="landing-logo">
                    <LogoIcon size="md" />
                    <span className="logo-text">UniTrack</span>
                </Link>

                <nav className="header-nav">
                    <Link to="/track" className="nav-link">Live Map</Link>
                    <Link to="/login">
                        <Button variant="secondary" size="sm">Login</Button>
                    </Link>
                </nav>
            </div>
        </header>
    );
}

export default LandingHeader;
