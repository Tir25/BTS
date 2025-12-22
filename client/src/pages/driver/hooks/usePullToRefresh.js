/**
 * usePullToRefresh Hook
 * Enables pull-to-refresh gesture on mobile
 * Single responsibility: Handle pull-to-refresh interaction
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 80; // pixels to trigger refresh

export function usePullToRefresh(onRefresh, options = {}) {
    const { disabled = false } = options;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef(null);

    const handleTouchStart = useCallback((e) => {
        if (disabled || isRefreshing) return;

        // Only start if at top of scroll
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
        }
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e) => {
        if (disabled || isRefreshing || !startY.current) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            // Apply resistance to pull
            const distance = Math.min(diff * 0.5, THRESHOLD * 1.5);
            setPullDistance(distance);

            if (diff > 10) {
                e.preventDefault();
            }
        }
    }, [disabled, isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= THRESHOLD && onRefresh) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        setPullDistance(0);
        startY.current = 0;
    }, [pullDistance, onRefresh]);

    // Attach listeners to container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const pullIndicatorStyle = {
        transform: `translateY(${pullDistance}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none'
    };

    const showIndicator = pullDistance > 20 || isRefreshing;
    const willRefresh = pullDistance >= THRESHOLD;

    return {
        containerRef,
        isRefreshing,
        pullDistance,
        pullIndicatorStyle,
        showIndicator,
        willRefresh
    };
}

export default usePullToRefresh;
