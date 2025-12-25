/**
 * GPSCard Component
 * Displays GPS tracking status and location info
 * Single responsibility: Show GPS/location status
 */
import { Card, CardBody } from '@/components/ui';
import { MapPin } from 'lucide-react';

export function GPSCard({ isTracking, location, error, queueCount }) {
    return (
        <Card className="gps-card">
            <CardBody>
                <h3><MapPin size={18} /> GPS Tracking</h3>
                <div className="gps-status">
                    <span className={`tracking-indicator ${isTracking ? 'active' : ''}`} />
                    <span>{isTracking ? 'Sharing Location' : 'Not Tracking'}</span>
                    {queueCount > 0 && (
                        <span className="queue-badge">{queueCount} queued</span>
                    )}
                </div>

                {location && (
                    <div className="location-info">
                        <p>Lat: {location.lat.toFixed(6)}</p>
                        <p>Lng: {location.lng.toFixed(6)}</p>
                        {location.speed !== null && (
                            <p>Speed: {(location.speed * 3.6).toFixed(1)} km/h</p>
                        )}
                    </div>
                )}

                {error && <p className="error-text">{error}</p>}
            </CardBody>
        </Card>
    );
}

export default GPSCard;

