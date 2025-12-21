import { useState, createContext, useContext, useCallback } from 'react';
import { Button, Card, CardBody } from './index';
import './ConfirmDialog.css';

const ConfirmContext = createContext();

/**
 * ConfirmDialog Provider - Wrap app to enable confirm dialogs
 */
export function ConfirmProvider({ children }) {
    const [dialog, setDialog] = useState(null);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setDialog({
                title: options.title || 'Confirm',
                message: options.message || 'Are you sure?',
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                variant: options.variant || 'danger',
                onConfirm: () => { setDialog(null); resolve(true); },
                onCancel: () => { setDialog(null); resolve(false); }
            });
        });
    }, []);

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {dialog && (
                <div className="confirm-overlay">
                    <Card className="confirm-dialog">
                        <CardBody>
                            <h3>{dialog.title}</h3>
                            <p>{dialog.message}</p>
                            <div className="confirm-actions">
                                <Button variant="ghost" onClick={dialog.onCancel}>
                                    {dialog.cancelText}
                                </Button>
                                <Button variant={dialog.variant} onClick={dialog.onConfirm}>
                                    {dialog.confirmText}
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

/**
 * useConfirm hook - use in components
 * Usage: const { confirm } = useConfirm();
 *        const result = await confirm({ message: 'Delete?' });
 */
export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within ConfirmProvider');
    }
    return context;
}

export default ConfirmProvider;
