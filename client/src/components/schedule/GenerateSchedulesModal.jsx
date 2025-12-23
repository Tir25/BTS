/**
 * GenerateSchedulesModal Component
 * Date range picker with preview for bulk schedule generation
 */
import { useState, useMemo } from 'react';
import { Button, Card, CardBody, Input } from '@/components/ui';
import { generateDates } from '@/services/scheduleTemplates';
import './GenerateSchedulesModal.css';

// Helper to format date
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function GenerateSchedulesModal({
    template,
    driver,
    bus,
    route,
    shift,
    onGenerate,
    onCancel
}) {
    const today = new Date();
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 1);

    const [startDate, setStartDate] = useState(formatDate(today));
    const [endDate, setEndDate] = useState(formatDate(defaultEnd));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Preview dates that will be generated
    const previewDates = useMemo(() => {
        if (!startDate || !endDate) return [];
        return generateDates(
            template.daysOfWeek,
            new Date(startDate),
            new Date(endDate)
        );
    }, [template.daysOfWeek, startDate, endDate]);

    const handleGenerate = async () => {
        if (previewDates.length === 0) {
            setError('No dates match the selected range');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await onGenerate(previewDates);
        } catch (err) {
            setError(err.message || 'Failed to generate schedules');
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <Card className="generate-modal">
                <CardBody>
                    <h3>Generate Schedules</h3>
                    <p className="modal-subtitle">
                        From template: <strong>{template.name}</strong>
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    <div className="template-summary">
                        <div className="summary-item">
                            <span className="label">Driver:</span>
                            <span>{driver?.name}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Bus:</span>
                            <span>#{bus?.busNo || bus?.number}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Route:</span>
                            <span>{route?.name || 'No route'}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Shift:</span>
                            <span>{shift?.name}</span>
                        </div>
                    </div>

                    <div className="date-range-picker">
                        <div className="form-group">
                            <label>Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>End Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="preview-section">
                        <h4>
                            Preview
                            <span className="count-badge">{previewDates.length} schedules</span>
                        </h4>
                        <div className="dates-preview">
                            {previewDates.slice(0, 10).map(date => (
                                <span key={date} className="date-chip">{date}</span>
                            ))}
                            {previewDates.length > 10 && (
                                <span className="date-chip more">
                                    +{previewDates.length - 10} more
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            loading={loading}
                            disabled={previewDates.length === 0}
                        >
                            Generate {previewDates.length} Schedules
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

export default GenerateSchedulesModal;
