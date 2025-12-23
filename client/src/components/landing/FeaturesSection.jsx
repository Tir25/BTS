/**
 * FeaturesSection Component
 * Grid of feature cards showcasing app capabilities
 * Single responsibility: Feature grid layout
 */
import { FeatureCard } from './FeatureCard';
import './FeaturesSection.css';

// Feature data - easily extensible
const FEATURES = [
    {
        icon: 'mapPin',
        title: 'Live Tracking',
        description: 'See all buses on the map in real-time with GPS accuracy'
    },
    {
        icon: 'clock',
        title: 'ETA Updates',
        description: 'Know exactly when the bus arrives at your stop'
    },
    {
        icon: 'map',
        title: 'Route Info',
        description: 'View all stops and routes at a glance'
    },
    {
        icon: 'star',
        title: 'Favorites',
        description: 'Save your preferred routes for quick access'
    }
];

export function FeaturesSection() {
    return (
        <section className="features-section">
            <div className="features-container">
                <h2 className="features-heading">
                    Everything you need to <span className="text-gradient">never miss a bus</span>
                </h2>
                <div className="features-grid">
                    {FEATURES.map((feature) => (
                        <FeatureCard
                            key={feature.icon}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default FeaturesSection;
