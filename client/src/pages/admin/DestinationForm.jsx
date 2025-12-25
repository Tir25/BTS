import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button, Input, Card, CardBody, CardHeader } from '@/components/ui';
import { DESTINATION_TYPES, DEFAULT_DESTINATION } from '@/services/destinations';
import { MapPin, MousePointer2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom red marker for destinations
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Map click handler
function MapClickHandler({ onClick }) {
    useMapEvents({
        click: onClick
    });
    return null;
}

/**
 * Destination Form Modal - Add/Edit destination with map picker
 */
export function DestinationForm({ destination, onSubmit, onClose }) {
    const [formData, setFormData] = useState({
        name: destination?.name || '',
        shortName: destination?.shortName || '',
        address: destination?.address || '',
        lat: destination?.lat || DEFAULT_DESTINATION.lat,
        lng: destination?.lng || DEFAULT_DESTINATION.lng,
        type: destination?.type || 'custom',
        color: destination?.color || '#ef4444',
        icon: destination?.icon || 'pin',
        isDefault: destination?.isDefault || false,
        isActive: destination?.isActive ?? true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleMapClick = useCallback((e) => {
        setFormData(prev => ({
            ...prev,
            lat: e.latlng.lat,
            lng: e.latlng.lng
        }));
    }, []);

    const handleTypeChange = (e) => {
        const type = e.target.value;
        const typeInfo = DESTINATION_TYPES.find(t => t.value === type);
        setFormData(prev => ({
            ...prev,
            type,
            icon: typeInfo?.icon || 'pin'
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('Destination name is required');
            return;
        }

        setLoading(true);

        try {
            await onSubmit({
                ...formData,
                name: formData.name.trim(),
                shortName: formData.shortName.trim(),
                address: formData.address.trim()
            });
        } catch (err) {
            setError(err.message || 'Failed to save destination');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <Card className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                <CardHeader>
                    <h3>{destination ? 'Edit Destination' : 'Add New Destination'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </CardHeader>
                <CardBody>
                    {error && <div className="form-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="driver-form">
                        {/* Map Picker */}
                        <div className="map-picker-container">
                            <MapContainer
                                center={[formData.lat, formData.lng]}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap'
                                />
                                <MapClickHandler onClick={handleMapClick} />
                                <Marker position={[formData.lat, formData.lng]} icon={redIcon} />
                            </MapContainer>
                        </div>
                        <p className="map-picker-hint"><MousePointer2 size={14} /> Click on the map to set destination location</p>

                        <div className="destination-form-grid">
                            <Input
                                label="Destination Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Ganpat University"
                                required
                            />

                            <Input
                                label="Short Name"
                                name="shortName"
                                value={formData.shortName}
                                onChange={handleChange}
                                placeholder="e.g., GNSU"
                            />

                            <div className="input-group full-width">
                                <Input
                                    label="Address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Full address"
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleTypeChange}
                                    className="input"
                                >
                                    {DESTINATION_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Marker Color</label>
                                <div className="color-picker-group">
                                    <input
                                        type="color"
                                        name="color"
                                        value={formData.color}
                                        onChange={handleChange}
                                    />
                                    <div
                                        className="color-preview"
                                        style={{ backgroundColor: formData.color }}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Coordinates</label>
                                <p className="text-muted" style={{ margin: 0 }}>
                                    {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                                </p>
                            </div>

                            {!destination?.isDefault && (
                                <div className="input-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            name="isDefault"
                                            checked={formData.isDefault}
                                            onChange={handleChange}
                                        />
                                        Set as default destination (University Campus)
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <Button variant="secondary" type="button" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                {destination ? 'Save Changes' : 'Add Destination'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}

export default DestinationForm;
