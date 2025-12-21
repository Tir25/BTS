import './Card.css';

/**
 * Reusable Card component with glass effect
 * @param {Object} props
 * @param {'default'|'elevated'|'outlined'} variant
 * @param {boolean} hoverable - Add hover effect
 * @param {boolean} clickable - Add click styles
 */
export function Card({
    children,
    variant = 'default',
    hoverable = false,
    clickable = false,
    className = '',
    onClick,
    ...props
}) {
    const classes = [
        'card',
        `card-${variant}`,
        hoverable && 'card-hoverable',
        clickable && 'card-clickable',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            onClick={onClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }) {
    return <div className={`card-header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
    return <div className={`card-body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
    return <div className={`card-footer ${className}`}>{children}</div>;
}

export default Card;
