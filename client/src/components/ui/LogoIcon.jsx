/**
 * LogoIcon Component
 * Uses the custom bus tracker icon for branding consistency
 */
import './LogoIcon.css';

export function LogoIcon({ size = 'md', className = '' }) {
    return (
        <img
            src="/icons/icon-192.png"
            alt="UniTrack"
            className={`logo-icon-img logo-icon-${size} ${className}`}
        />
    );
}

export default LogoIcon;
