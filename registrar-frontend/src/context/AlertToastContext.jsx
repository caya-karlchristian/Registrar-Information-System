import { createContext, useContext, useState, useCallback } from 'react';
import ErrorToast from '../components/ErrorToast';
import SuccessToast from '../components/SuccessToast';

// -------------------------------------------------------
// AlertToastContext
//
// Lightweight, transient, auto-dismissing toasts (the "green and red
// ones" — ErrorToast / SuccessToast) for ephemeral UI feedback: voice
// command not recognized, mic permission denied, browser unsupported,
// action confirmations, etc.
//
// Deliberately separate from NotificationToastContext, which drives the
// persistent, click-to-inbox Notification system (payment updates,
// request status changes, announcements). Anything that isn't a real
// notification belongs here instead — never dispatched through
// NotificationToastContext's addToast().
// -------------------------------------------------------
const AlertToastContext = createContext(null);

export const AlertToastProvider = ({ children }) => {
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const showError = useCallback((message) => {
        setErrorMessage(message);
    }, []);

    const showSuccess = useCallback((message) => {
        setSuccessMessage(message);
    }, []);

    const clearError = useCallback(() => setErrorMessage(null), []);
    const clearSuccess = useCallback(() => setSuccessMessage(null), []);

    return (
        <AlertToastContext.Provider value={{ showError, showSuccess }}>
            {children}
            <ErrorToast message={errorMessage} onClose={clearError} />
            <SuccessToast message={successMessage} onClose={clearSuccess} />
        </AlertToastContext.Provider>
    );
};

export const useAlertToast = () => {
    const ctx = useContext(AlertToastContext);
    if (!ctx) throw new Error('useAlertToast must be used inside AlertToastProvider');
    return ctx;
};
