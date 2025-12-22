/**
 * StopsList Component
 * Draggable list of route stops
 * Single responsibility: Display and reorder route stops
 */

export function StopsList({
    stops,
    onRemove,
    onNameChange,
    onReorder
}) {
    // Refs for drag and drop
    let dragItem = null;
    let dragOverItem = null;

    const handleDragStart = (index) => {
        dragItem = index;
    };

    const handleDragEnter = (index) => {
        dragOverItem = index;
    };

    const handleDragEnd = () => {
        if (dragItem === null || dragOverItem === null) return;
        if (dragItem === dragOverItem) return;

        onReorder(dragItem, dragOverItem);
        dragItem = null;
        dragOverItem = null;
    };

    if (stops.length === 0) {
        return <p className="text-muted">Click on map to add stops</p>;
    }

    return (
        <ul className="stops-list">
            {stops.map((stop, idx) => (
                <li
                    key={stop.id}
                    className="stop-item"
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <span className="stop-drag">⋮⋮</span>
                    <span className="stop-number">{idx + 1}</span>
                    <input
                        type="text"
                        value={stop.name}
                        onChange={(e) => onNameChange(stop.id, e.target.value)}
                        className="stop-name-input"
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(stop.id)}
                        className="stop-remove"
                    >
                        ×
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default StopsList;
