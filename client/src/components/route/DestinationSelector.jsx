/**
 * DestinationSelector Component
 * Dropdown for selecting route destination from managed destinations list
 */
import { useState, useEffect } from 'react';
import { destinationsService } from '@/services/destinations';
import { MapPin } from 'lucide-react';

export function DestinationSelector({
    value,
    onChange,
    label = 'Destination',
    required = false
}) {
    const [destinations, setDestinations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDestinations();
    }, []);

    const loadDestinations = async () => {
        try {
            // Seed default if needed, then get active destinations
            await destinationsService.seedDefaultIfNeeded();
            const data = await destinationsService.getActive();
            setDestinations(data);

            // Auto-select default if no value and default exists
            if (!value) {
                const defaultDest = data.find(d => d.isDefault);
                if (defaultDest) {
                    onChange(defaultDest.id);
                }
            }
        } catch (error) {
            console.error('Failed to load destinations:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedDestination = destinations.find(d => d.id === value);

    return (
        <div className="input-group">
            <label className="input-label">
                {label}
                {required && <span className="required">*</span>}
            </label>
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="input"
                disabled={loading}
                required={required}
            >
                <option value="">
                    {loading ? 'Loading destinations...' : 'Select destination'}
                </option>
                {destinations.map(dest => (
                    <option key={dest.id} value={dest.id}>
                        {dest.name}
                        {dest.isDefault ? ' (Default)' : ''}
                        {dest.type !== 'campus' ? ` - ${dest.type}` : ''}
                    </option>
                ))}
            </select>
            {selectedDestination && (
                <p className="input-hint">
                    <MapPin size={14} /> {selectedDestination.address || 'No address'}
                </p>
            )}
        </div>
    );
}

export default DestinationSelector;
