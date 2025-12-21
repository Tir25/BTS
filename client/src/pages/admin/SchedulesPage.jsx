/**
 * Schedules Page - Calendar-based scheduling with conflict detection
 * Refactored for modularity, using custom hook and UI components
 */
import { useState, useMemo } from 'react';
import { Button, Card, CardBody, useConfirm, useToast } from '@/components/ui';
import { useScheduleData } from '@/hooks/useScheduleData';
import { Calendar, DaySchedules, ScheduleForm } from '@/components/schedule';
import './SchedulesPage.css';

export function SchedulesPage() {
    const {
        drivers, buses, routes, shifts, schedules,
        loading, error, hasRequiredData,
        createSchedule, updateSchedule, deleteSchedule, checkConflicts
    } = useScheduleData();

    const { confirm } = useConfirm();
    const { toast } = useToast();

    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Filter schedules for selected date
    const dateSchedules = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        return schedules.filter(s => s.date === dateStr);
    }, [schedules, selectedDate]);

    // Handle form submission (create or update)
    const handleFormSubmit = async (data) => {
        try {
            if (editingSchedule) {
                await updateSchedule(editingSchedule.id, data);
                toast.success('Schedule updated successfully');
            } else {
                await createSchedule(data);
                toast.success('Schedule created successfully');
            }
            setShowForm(false);
            setEditingSchedule(null);
        } catch (err) {
            toast.error(`Failed to ${editingSchedule ? 'update' : 'create'} schedule`);
        }
    };

    // Handle delete with confirmation
    const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Delete Schedule',
            message: 'Are you sure you want to delete this schedule?',
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await deleteSchedule(id);
            toast.success('Schedule deleted');
        } catch (err) {
            toast.error('Failed to delete schedule');
        }
    };

    // Handle edit
    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setShowForm(true);
    };

    // Open create form
    const openCreateForm = () => {
        setEditingSchedule(null);
        setShowForm(true);
    };

    if (loading) {
        return <div className="loading-state">Loading scheduling data...</div>;
    }

    if (error) {
        return <div className="error-state">{error}</div>;
    }

    return (
        <div className="schedules-page">
            <header className="page-header">
                <h2>📅 Schedules</h2>
                {hasRequiredData && (
                    <Button onClick={openCreateForm}>+ Create Schedule</Button>
                )}
            </header>

            {!hasRequiredData ? (
                <SetupRequired drivers={drivers} buses={buses} shifts={shifts} />
            ) : (
                <div className="schedules-layout">
                    <Calendar
                        currentMonth={currentMonth}
                        selectedDate={selectedDate}
                        schedules={schedules}
                        onSelectDate={setSelectedDate}
                        onChangeMonth={setCurrentMonth}
                    />
                    <DaySchedules
                        date={selectedDate}
                        schedules={dateSchedules}
                        drivers={drivers}
                        buses={buses}
                        routes={routes}
                        shifts={shifts}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAdd={openCreateForm}
                    />
                </div>
            )}

            {showForm && (
                <ScheduleForm
                    schedule={editingSchedule}
                    date={selectedDate}
                    drivers={drivers}
                    buses={buses}
                    routes={routes}
                    shifts={shifts}
                    checkConflicts={(data) => checkConflicts(data, editingSchedule?.id)}
                    onSubmit={handleFormSubmit}
                    onCancel={() => { setShowForm(false); setEditingSchedule(null); }}
                />
            )}
        </div>
    );
}

// Setup Required Component (inline - small & focused)
function SetupRequired({ drivers, buses, shifts }) {
    return (
        <Card className="setup-required">
            <CardBody>
                <h3>📋 Setup Required</h3>
                <p>Before creating schedules, you need to add:</p>
                <ul className="setup-list">
                    {drivers.length === 0 && <li>✗ At least one driver</li>}
                    {buses.length === 0 && <li>✗ At least one bus</li>}
                    {shifts.length === 0 && <li>✗ At least one shift</li>}
                    {drivers.length > 0 && <li className="done">✓ Drivers ({drivers.length})</li>}
                    {buses.length > 0 && <li className="done">✓ Buses ({buses.length})</li>}
                    {shifts.length > 0 && <li className="done">✓ Shifts ({shifts.length})</li>}
                </ul>
            </CardBody>
        </Card>
    );
}

export default SchedulesPage;
