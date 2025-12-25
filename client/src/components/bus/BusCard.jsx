/**
 * BusCard Component - Displays individual bus information
 * Enhanced mobile-friendly design with gradient header and styled actions
 */
import { Bus, Users, Edit, Trash2 } from 'lucide-react';
import './BusCard.css';

export function BusCard({ bus, onEdit, onDelete }) {
    const statusClass = bus.status?.toLowerCase() || 'inactive';

    return (
        <div className="bus-card">
            {/* Header with gradient based on status */}
            <div className={`bus-card-header ${statusClass}`}>
                <span className="bus-number-badge">
                    {bus.busNo ? `#${bus.busNo}` : <Bus size={16} />}
                </span>
                <span className="bus-status-badge">
                    {bus.status || 'Inactive'}
                </span>
            </div>

            {/* Card Body */}
            <div className="bus-card-body">
                <h4 className="bus-card-title">
                    <Bus size={18} />
                    {bus.number || `Bus ${bus.busNo}`}
                </h4>
                <p className="bus-card-plate">{bus.licensePlate}</p>

                <div className="bus-info-row">
                    <Users size={16} />
                    <span>Capacity: {bus.capacity} seats</span>
                </div>

                {/* Action Buttons */}
                <div className="bus-card-actions">
                    <button className="btn btn-edit" onClick={onEdit}>
                        <Edit size={14} /> Edit
                    </button>
                    <button className="btn btn-delete" onClick={onDelete}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BusCard;
