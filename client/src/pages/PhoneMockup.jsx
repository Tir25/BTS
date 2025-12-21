import { useState, useEffect } from 'react';
import './PhoneMockup.css';

const SCREENS = [
    {
        id: 'map',
        title: 'Live Tracking',
        content: (
            <div className="mock-map">
                <div className="mock-map-bg" />
                <div className="mock-bus mock-bus-1">🚌</div>
                <div className="mock-bus mock-bus-2">🚌</div>
                <div className="mock-route" />
            </div>
        )
    },
    {
        id: 'routes',
        title: 'Routes',
        content: (
            <div className="mock-list">
                <div className="mock-item">
                    <span className="mock-badge blue">A</span>
                    <span>Campus Loop A</span>
                </div>
                <div className="mock-item">
                    <span className="mock-badge green">B</span>
                    <span>Library Express</span>
                </div>
                <div className="mock-item">
                    <span className="mock-badge purple">C</span>
                    <span>Dormitory Route</span>
                </div>
            </div>
        )
    },
    {
        id: 'eta',
        title: 'Next Bus',
        content: (
            <div className="mock-eta">
                <div className="mock-eta-main">
                    <span className="mock-eta-time">3</span>
                    <span className="mock-eta-unit">min</span>
                </div>
                <div className="mock-eta-label">Bus arriving at Main Gate</div>
                <div className="mock-eta-route">Route A • Campus Loop</div>
            </div>
        )
    }
];

/**
 * Animated phone mockup showing app screens
 */
export function PhoneMockup() {
    const [activeIndex, setActiveIndex] = useState(0);

    // Auto-rotate screens
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % SCREENS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="phone-mockup">
            <div className="phone-frame">
                {/* Notch */}
                <div className="phone-notch" />

                {/* Screen */}
                <div className="phone-screen">
                    <div className="phone-header">
                        <span className="phone-title">{SCREENS[activeIndex].title}</span>
                    </div>
                    <div className="phone-content">
                        {SCREENS[activeIndex].content}
                    </div>
                </div>

                {/* Dots Navigation */}
                <div className="phone-dots">
                    {SCREENS.map((screen, index) => (
                        <button
                            key={screen.id}
                            className={`phone-dot ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => setActiveIndex(index)}
                            aria-label={`View ${screen.title}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PhoneMockup;
