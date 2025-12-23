/**
 * FeatureCard Component
 * Modern feature card with SVG icon and hover effects
 * Single responsibility: Display one feature
 */
import { Icon } from '@/components/ui';
import './FeatureCard.css';

/**
 * @param {string} icon - Icon name from Icon component
 * @param {string} title - Feature title
 * @param {string} description - Feature description
 */
export function FeatureCard({ icon, title, description }) {
    return (
        <div className="feature-card">
            <div className="feature-icon-wrapper">
                <Icon name={icon} size="lg" />
            </div>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-description">{description}</p>
        </div>
    );
}

export default FeatureCard;
