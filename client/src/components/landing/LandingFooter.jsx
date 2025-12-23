/**
 * LandingFooter Component
 * Enhanced footer with links and copyright
 * Single responsibility: Landing page footer
 */
import './LandingFooter.css';

export function LandingFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="landing-footer">
            <div className="footer-container">
                <div className="footer-links">
                    <a href="mailto:support@unitracker.edu">Help & Support</a>
                    <span className="footer-divider">•</span>
                    <a href="#routes">Route Schedules</a>
                    <span className="footer-divider">•</span>
                    <a href="#about">About UniTrack</a>
                </div>
                <p className="footer-copyright">
                    © {year} UniTrack. Built for university transportation.
                </p>
            </div>
        </footer>
    );
}

export default LandingFooter;
