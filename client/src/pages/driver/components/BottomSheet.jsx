/**
 * BottomSheet Component
 * Tap-to-toggle bottom sheet with arrow button
 * Two states: collapsed (default) and expanded
 */
import { useState, useEffect } from 'react';
import './BottomSheet.css';

export function BottomSheet({
    children,
    defaultExpanded = false,
    className = ''
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Update state when defaultExpanded changes
    useEffect(() => {
        setIsExpanded(defaultExpanded);
    }, [defaultExpanded]);

    const toggleSheet = () => {
        setIsExpanded(prev => !prev);
    };

    return (
        <div className={`bottom-sheet ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}>
            {/* Arrow Control Area */}
            <div className="sheet-control-area" onClick={toggleSheet}>
                <div className="sheet-handle" />
                <button
                    className="arrow-btn"
                    aria-label={isExpanded ? 'Collapse sheet' : 'Expand sheet'}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        {isExpanded ? (
                            <polyline points="6 9 12 15 18 9" />
                        ) : (
                            <polyline points="18 15 12 9 6 15" />
                        )}
                    </svg>
                </button>
            </div>

            <div className="sheet-content">
                {children}
            </div>
        </div>
    );
}

export default BottomSheet;
