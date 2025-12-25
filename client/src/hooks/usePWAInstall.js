/**
 * usePWAInstall Hook
 * Captures beforeinstallprompt event and provides install functionality
 */
import { useState, useEffect, useCallback } from 'react';

export function usePWAInstall() {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Capture the install prompt
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
            setIsInstallable(true);
        };

        // Handle successful installation
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setInstallPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!installPrompt) return false;

        try {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;

            if (outcome === 'accepted') {
                setIsInstalled(true);
                setIsInstallable(false);
            }

            setInstallPrompt(null);
            return outcome === 'accepted';
        } catch (err) {
            console.error('Install prompt error:', err);
            return false;
        }
    }, [installPrompt]);

    return {
        isInstallable,
        isInstalled,
        promptInstall
    };
}

export default usePWAInstall;
