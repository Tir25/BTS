/**
 * PullToRefreshIndicator Component
 * Visual indicator for pull-to-refresh gesture
 */

export function PullToRefreshIndicator({ isRefreshing, willRefresh, pullDistance }) {
    if (pullDistance <= 20 && !isRefreshing) return null;

    return (
        <div className="pull-indicator" style={{
            opacity: Math.min(pullDistance / 60, 1),
            transform: `rotate(${isRefreshing ? '0deg' : `${pullDistance * 3}deg`})`
        }}>
            {isRefreshing ? (
                <span className="refresh-spinner">↻</span>
            ) : willRefresh ? (
                <span className="release-text">↓ Release to refresh</span>
            ) : (
                <span className="pull-text">↓ Pull to refresh</span>
            )}
        </div>
    );
}

export default PullToRefreshIndicator;
