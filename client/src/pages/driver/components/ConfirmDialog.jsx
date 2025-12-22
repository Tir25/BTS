/**
 * ConfirmDialog Component
 * Reusable confirmation modal with glassmorphism styling
 * Used for destructive actions like going offline
 */
import './ConfirmDialog.css';

export function ConfirmDialog({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger', // 'danger' | 'primary'
    onConfirm,
    onCancel,
    loading = false
}) {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !loading) {
            onCancel?.();
        }
    };

    return (
        <div className="confirm-dialog-overlay" onClick={handleBackdropClick}>
            <div className="confirm-dialog">
                <h3 className="confirm-title">{title}</h3>
                <p className="confirm-message">{message}</p>

                <div className="confirm-actions">
                    <button
                        className="confirm-btn cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`confirm-btn ${confirmVariant}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="confirm-spinner" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;
