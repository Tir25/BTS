import { useState, useEffect } from 'react';
import { shiftsService } from '@/services/database';
import { Button, Card, CardBody, Input, useConfirm, useToast } from '@/components/ui';
import { ShiftCard } from '@/components/shift';
import ShiftForm from './ShiftForm';
import './ShiftsPage.css';

/**
 * Shifts Management Page
 */
export function ShiftsPage() {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingShift, setEditingShift] = useState(null);

    const { confirm } = useConfirm();
    const { toast } = useToast();

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        try {
            setLoading(true);
            const data = await shiftsService.getAll();
            setShifts(data);
        } catch (err) {
            setError('Failed to load shifts');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingShift(null);
        setShowForm(true);
    };

    const handleEdit = (shift) => {
        setEditingShift(shift);
        setShowForm(true);
    };

    const handleDelete = async (id, name) => {
        const confirmed = await confirm({
            title: 'Delete Shift',
            message: `Are you sure you want to delete shift "${name}"?`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await shiftsService.delete(id);
            setShifts(prev => prev.filter(s => s.id !== id));
            toast.success('Shift deleted successfully');
        } catch (err) {
            setError('Failed to delete shift');
            toast.error('Failed to delete shift');
        }
    };

    const handleFormSubmit = async (data) => {
        try {
            if (editingShift) {
                await shiftsService.update(editingShift.id, data);
                setShifts(prev => prev.map(s =>
                    s.id === editingShift.id ? { ...s, ...data } : s
                ));
                toast.success('Shift updated successfully');
            } else {
                const newShift = await shiftsService.create(data);
                setShifts(prev => [newShift, ...prev]);
                toast.success('Shift added successfully');
            }
            setShowForm(false);
            setEditingShift(null);
        } catch (err) {
            toast.error(`Failed to ${editingShift ? 'update' : 'add'} shift`);
        }
    };

    if (loading) {
        return <div className="loading-state">Loading shifts...</div>;
    }

    return (
        <div className="drivers-page">
            <header className="page-header">
                <h2>Shifts Management</h2>
                <Button onClick={handleAdd}>+ Add Shift</Button>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {shifts.length === 0 ? (
                <Card className="empty-state">
                    <CardBody>
                        <p>No shifts found. Add shifts to organize driver schedules.</p>
                    </CardBody>
                </Card>
            ) : (
                <div className="drivers-grid">
                    {shifts.map(shift => (
                        <ShiftCard
                            key={shift.id}
                            shift={shift}
                            onEdit={() => handleEdit(shift)}
                            onDelete={() => handleDelete(shift.id, shift.name)}
                        />
                    ))}
                </div>
            )}

            {showForm && (
                <ShiftForm
                    shift={editingShift}
                    onSubmit={handleFormSubmit}
                    onClose={() => { setShowForm(false); setEditingShift(null); }}
                />
            )}
        </div>
    );
}

export default ShiftsPage;
