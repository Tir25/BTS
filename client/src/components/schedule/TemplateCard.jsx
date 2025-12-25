/**
 * TemplateCard Component
 * Displays a schedule template with weekday indicators
 */
import { Card, CardBody, Button } from '@/components/ui';
import { DAYS_OF_WEEK } from '@/services/scheduleTemplates';
import { Pencil, Trash2, CalendarPlus } from 'lucide-react';
import './TemplateCard.css';

export function TemplateCard({
    template,
    driver,
    bus,
    route,
    shift,
    onEdit,
    onDelete,
    onGenerate
}) {
    const daysOfWeek = template.daysOfWeek || [];

    return (
        <Card className="template-card">
            <CardBody>
                <div className="template-header">
                    <h4>{template.name}</h4>
                    <div className="template-actions">
                        <button className="icon-btn" onClick={onEdit} title="Edit">
                            <Pencil size={14} />
                        </button>
                        <button className="icon-btn danger" onClick={onDelete} title="Delete">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="template-details">
                    <div className="detail-row">
                        <span className="label">Driver:</span>
                        <span className="value">{driver?.name || 'Unknown'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Bus:</span>
                        <span className="value">#{bus?.busNo || bus?.number || 'Unknown'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Route:</span>
                        <span className="value">{route?.name || 'No route'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Shift:</span>
                        <span className="value">
                            {shift?.name || 'Unknown'} ({shift?.startTime} - {shift?.endTime})
                        </span>
                    </div>
                </div>

                <div className="weekday-indicators">
                    {DAYS_OF_WEEK.map(day => (
                        <span
                            key={day.key}
                            className={`day-badge ${daysOfWeek.includes(day.key) ? 'active' : ''}`}
                            title={day.label}
                        >
                            {day.short}
                        </span>
                    ))}
                </div>

                <Button
                    className="generate-btn"
                    onClick={onGenerate}
                >
                    <CalendarPlus size={16} /> Generate Schedules
                </Button>
            </CardBody>
        </Card>
    );
}

export default TemplateCard;

