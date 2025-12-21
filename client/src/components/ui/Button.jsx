import './Button.css';

/**
 * Reusable Button component with variants
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} variant - Button style
 * @param {'sm'|'md'|'lg'} size - Button size
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} fullWidth - Take full width
 */
export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled = false,
    type = 'button',
    onClick,
    className = '',
    ...props
}) {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full',
        loading && 'btn-loading',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading ? (
                <span className="btn-spinner" aria-label="Loading" />
            ) : (
                children
            )}
        </button>
    );
}

export default Button;
