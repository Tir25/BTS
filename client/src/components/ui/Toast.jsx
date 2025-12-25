import { useState, createContext, useContext, useCallback } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext();

/**
 * Toast icon components mapping
 */
const TOAST_ICONS = {
    success: Check,
    error: X,
    warning: AlertTriangle,
    info: Info
};

/**
 * Toast Provider - Wrap app to enable toast notifications
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((options) => {
        const id = Date.now();
        const toast = {
            id,
            message: typeof options === 'string' ? options : options.message,
            type: options.type || 'info',
            duration: options.duration || 3000
        };

        setToasts(prev => [...prev, toast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, toast.duration);
    }, []);

    const toast = {
        info: (msg) => addToast({ message: msg, type: 'info' }),
        success: (msg) => addToast({ message: msg, type: 'success' }),
        error: (msg) => addToast({ message: msg, type: 'error' }),
        warning: (msg) => addToast({ message: msg, type: 'warning' })
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => {
                    const IconComponent = TOAST_ICONS[t.type];
                    return (
                        <div key={t.id} className={`toast toast-${t.type}`}>
                            <span className="toast-icon">
                                <IconComponent size={16} />
                            </span>
                            <span className="toast-message">{t.message}</span>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

/**
 * useToast hook - use in components
 * Usage: const { toast } = useToast();
 *        toast.success('Saved!');
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

export default ToastProvider;

