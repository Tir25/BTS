import { Card, CardBody } from '@/components/ui';

/**
 * Calendar Component - Monthly calendar grid with schedule indicators
 */
export function Calendar({ currentMonth, selectedDate, schedules, onSelectDate, onChangeMonth }) {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        const daySchedules = schedules.filter(s => s.date === dateStr);
        const isSelected = selectedDate.toDateString() === date.toDateString();
        const isToday = new Date().toDateString() === date.toDateString();

        days.push(
            <div
                key={day}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => onSelectDate(date)}
            >
                <span className="day-number">{day}</span>
                {daySchedules.length > 0 && (
                    <span className="schedule-dot">{daySchedules.length}</span>
                )}
            </div>
        );
    }

    const prevMonth = () => {
        onChangeMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        onChangeMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <Card className="calendar-card">
            <CardBody>
                <div className="calendar-header">
                    <button className="nav-btn" onClick={prevMonth}>◀</button>
                    <h3>{monthName}</h3>
                    <button className="nav-btn" onClick={nextMonth}>▶</button>
                </div>
                <div className="calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="weekday">{d}</div>
                    ))}
                </div>
                <div className="calendar-grid">{days}</div>
            </CardBody>
        </Card>
    );
}

export default Calendar;
