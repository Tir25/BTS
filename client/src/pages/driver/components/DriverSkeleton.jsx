/**
 * DriverSkeleton Component
 * Loading skeleton for driver dashboard
 * Single responsibility: Show loading placeholder UI
 */
import { Card, CardBody } from '@/components/ui';
import './DriverSkeleton.css';

export function DriverSkeleton() {
    return (
        <div className="driver-skeleton">
            {/* Status Card Skeleton */}
            <Card className="skeleton-card">
                <CardBody>
                    <div className="skeleton-status">
                        <div className="skeleton-dot" />
                        <div className="skeleton-text skeleton-text-sm" />
                    </div>
                    <div className="skeleton-text skeleton-text-lg" />
                </CardBody>
            </Card>

            {/* Button Skeleton */}
            <div className="skeleton-button" />

            {/* Route Card Skeleton */}
            <Card className="skeleton-card">
                <CardBody>
                    <div className="skeleton-text skeleton-text-md" />
                    <div className="skeleton-divider" />
                    <div className="skeleton-row">
                        <div className="skeleton-circle" />
                        <div className="skeleton-text skeleton-text-full" />
                    </div>
                    <div className="skeleton-row">
                        <div className="skeleton-circle" />
                        <div className="skeleton-text skeleton-text-full" />
                    </div>
                    <div className="skeleton-row">
                        <div className="skeleton-circle" />
                        <div className="skeleton-text skeleton-text-full" />
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

export default DriverSkeleton;
