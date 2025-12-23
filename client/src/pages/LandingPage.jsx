/**
 * Landing Page - Orchestrator Component
 * Composes modular landing components
 * Single responsibility: Page layout and component composition
 */
import {
    LandingHeader,
    HeroSection,
    StatsBar,
    FeaturesSection,
    LandingFooter
} from '@/components/landing';
import PhoneMockup from './PhoneMockup';
import './LandingPage.css';

export function LandingPage() {
    return (
        <div className="landing">
            <LandingHeader />
            <HeroSection mockup={<PhoneMockup />} />
            <StatsBar />
            <FeaturesSection />
            <LandingFooter />
        </div>
    );
}

export default LandingPage;
