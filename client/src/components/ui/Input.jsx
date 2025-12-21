import './Input.css';

/**
 * Reusable Input component
 * @param {Object} props
 * @param {string} label - Input label
 * @param {string} error - Error message
 * @param {string} icon - Icon element to show
 */
export function Input({
    label,
    error,
    icon,
    type = 'text',
    id,
    className = '',
    ...props
}) {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

    return (
        <div className={`input-group ${error ? 'input-error' : ''} ${className}`}>
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                </label>
            )}
            <div className="input-wrapper">
                {icon && <span className="input-icon">{icon}</span>}
                <input
                    type={type}
                    id={inputId}
                    className={`input ${icon ? 'input-with-icon' : ''}`}
                    {...props}
                />
            </div>
            {error && <span className="input-error-text">{error}</span>}
        </div>
    );
}

export default Input;
