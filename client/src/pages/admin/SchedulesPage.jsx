/**
 * Schedules Page - Calendar-based scheduling with templates
 * Features: Daily schedules, recurring templates, bulk generation
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, Card, CardBody, useConfirm, useToast } from '@/components/ui';
import { useScheduleData } from '@/hooks/useScheduleData';
import {
    Calendar, DaySchedules, ScheduleForm,
    TemplateCard, TemplateForm, GenerateSchedulesModal,
    SetupRequired
} from '@/components/schedule';
import { scheduleTemplatesService } from '@/services/scheduleTemplates';
import { schedulesService } from '@/services/database';
import { CalendarDays, ClipboardList } from 'lucide-react';
import './SchedulesPage.css';

export function SchedulesPage() {
    const {
        drivers, buses, routes, shifts, schedules,
        loading, error, hasRequiredData,
        createSchedule, updateSchedule, deleteSchedule, checkConflicts, refresh
    } = useScheduleData();

    const { confirm } = useConfirm();
    const { toast } = useToast();

    // View state
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'templates'

    // Schedules state
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Templates state
    const [templates, setTemplates] = useState([]);
    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generatingTemplate, setGeneratingTemplate] = useState(null);

    // Load templates
    const loadTemplates = useCallback(async () => {
        try {
            const data = await scheduleTemplatesService.getAll();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to load templates:', err);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // Helper to format date as YYYY-MM-DD in local timezone
    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Filter schedules for selected date
    const dateSchedules = useMemo(() => {
        const dateStr = formatLocalDate(selectedDate);
        return schedules.filter(s => s.date === dateStr);
    }, [schedules, selectedDate]);

    // Helper functions to get related data
    const getDriver = (id) => drivers.find(d => d.id === id);
    const getBus = (id) => buses.find(b => b.id === id);
    const getRoute = (id) => routes.find(r => r.id === id);
    const getShift = (id) => shifts.find(s => s.id === id);

    // Schedule handlers
    const handleFormSubmit = async (data) => {
        try {
            if (editingSchedule) {
                await updateSchedule(editingSchedule.id, data);
                toast.success('Schedule updated');
            } else {
                await createSchedule(data);
                toast.success('Schedule created');
            }
            setShowForm(false);
            setEditingSchedule(null);
        } catch (err) {
            toast.error(`Failed to ${editingSchedule ? 'update' : 'create'} schedule`);
        }
    };

    const handleDeleteSchedule = async (id) => {
        const confirmed = await confirm({
            title: 'Delete Schedule',
            message: 'Delete this schedule?',
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await deleteSchedule(id);
            toast.success('Schedule deleted');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    // Template handlers
    const handleTemplateSubmit = async (data) => {
        try {
            if (editingTemplate) {
                await scheduleTemplatesService.update(editingTemplate.id, data);
                toast.success('Template updated');
            } else {
                await scheduleTemplatesService.create(data);
                toast.success('Template created');
            }
            setShowTemplateForm(false);
            setEditingTemplate(null);
            loadTemplates();
        } catch (err) {
            toast.error('Failed to save template');
        }
    };

    const handleDeleteTemplate = async (template) => {
        const confirmed = await confirm({
            title: 'Delete Template',
            message: `Delete "${template.name}"?`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await scheduleTemplatesService.delete(template.id);
            toast.success('Template deleted');
            loadTemplates();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleGenerate = (template) => {
        setGeneratingTemplate(template);
        setShowGenerateModal(true);
    };

    const handleBulkGenerate = async (dates) => {
        try {
            const entries = scheduleTemplatesService.generateScheduleEntries(
                generatingTemplate,
                dates
            );
            await schedulesService.bulkCreate(entries);
            toast.success(`Created ${dates.length} schedules!`);
            setShowGenerateModal(false);
            setGeneratingTemplate(null);
            refresh();
        } catch (err) {
            toast.error('Failed to generate schedules');
            throw err;
        }
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
                <h2><CalendarDays size={24} /> Schedules</h2>
                <div className="header-actions">
                    <div className="tab-switcher">
                        <button
                            className={`tab-btn ${activeTab === 'schedules' ? 'active' : ''}`}
                            onClick={() => setActiveTab('schedules')}
                        >
                            Calendar
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                            onClick={() => setActiveTab('templates')}
                        >
                            Templates
                        </button>
                    </div>
                    {hasRequiredData && activeTab === 'schedules' && (
                        <Button onClick={() => setShowForm(true)}>+ Create Schedule</Button>
                    )}
                    {hasRequiredData && activeTab === 'templates' && (
                        <Button onClick={() => setShowTemplateForm(true)}>+ Create Template</Button>
                    )}
                </div>
            </header>

            {!hasRequiredData ? (
                <SetupRequired drivers={drivers} buses={buses} shifts={shifts} />
            ) : activeTab === 'schedules' ? (
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
                        onEdit={(s) => { setEditingSchedule(s); setShowForm(true); }}
                        onDelete={handleDeleteSchedule}
                        onAdd={() => setShowForm(true)}
                    />
                </div>
            ) : (
                <div className="templates-section">
                    {templates.length === 0 ? (
                        <Card className="empty-state">
                            <CardBody>
                                <h3><ClipboardList size={20} /> No Templates Yet</h3>
                                <p>Create recurring templates to quickly generate schedules for the week.</p>
                                <Button onClick={() => setShowTemplateForm(true)}>
                                    Create Your First Template
                                </Button>
                            </CardBody>
                        </Card>
                    ) : (
                        <div className="templates-grid">
                            {templates.map(template => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    driver={getDriver(template.driverId)}
                                    bus={getBus(template.busId)}
                                    route={getRoute(template.routeId)}
                                    shift={getShift(template.shiftId)}
                                    onEdit={() => { setEditingTemplate(template); setShowTemplateForm(true); }}
                                    onDelete={() => handleDeleteTemplate(template)}
                                    onGenerate={() => handleGenerate(template)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Schedule Form Modal */}
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

            {/* Template Form Modal */}
            {showTemplateForm && (
                <TemplateForm
                    template={editingTemplate}
                    drivers={drivers}
                    buses={buses}
                    routes={routes}
                    shifts={shifts}
                    onSubmit={handleTemplateSubmit}
                    onCancel={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
                />
            )}

            {/* Generate Schedules Modal */}
            {showGenerateModal && generatingTemplate && (
                <GenerateSchedulesModal
                    template={generatingTemplate}
                    driver={getDriver(generatingTemplate.driverId)}
                    bus={getBus(generatingTemplate.busId)}
                    route={getRoute(generatingTemplate.routeId)}
                    shift={getShift(generatingTemplate.shiftId)}
                    onGenerate={handleBulkGenerate}
                    onCancel={() => { setShowGenerateModal(false); setGeneratingTemplate(null); }}
                />
            )}
        </div>
    );
}

export default SchedulesPage;

