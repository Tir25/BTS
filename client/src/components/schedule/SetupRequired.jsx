/**
 * SetupRequired Component
 * Displays setup checklist when required entities are missing
 * Single responsibility: Show setup requirements for schedules
 */
import { Card, CardBody } from '@/components/ui';
import { ClipboardList, CheckCircle, XCircle } from 'lucide-react';
import './SetupRequired.css';

/**
 * @param {Object} props
 * @param {Array} props.drivers - List of drivers
 * @param {Array} props.buses - List of buses
 * @param {Array} props.shifts - List of shifts
 */
export function SetupRequired({ drivers, buses, shifts }) {
    const requirements = [
        { label: 'Drivers', items: drivers, required: true },
        { label: 'Buses', items: buses, required: true },
        { label: 'Shifts', items: shifts, required: true }
    ];

    return (
        <Card className="setup-required">
            <CardBody>
                <h3><ClipboardList size={20} /> Setup Required</h3>
                <p>Before creating schedules, you need to add:</p>
                <ul className="setup-list">
                    {requirements.map(({ label, items }) => (
                        <li key={label} className={items.length > 0 ? 'done' : 'pending'}>
                            {items.length > 0
                                ? <><CheckCircle size={16} className="icon-done" /> {label} ({items.length})</>
                                : <><XCircle size={16} className="icon-pending" /> At least one {label.toLowerCase().slice(0, -1)}</>
                            }
                        </li>
                    ))}
                </ul>
            </CardBody>
        </Card>
    );
}

export default SetupRequired;
