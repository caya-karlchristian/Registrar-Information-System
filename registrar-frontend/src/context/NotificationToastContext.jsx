import { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationToastContext = createContext(null);
const AUTO_DISMISS_MS = 5000;
const MAX_TOASTS      = 3;

export const NotificationToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timersRef           = useRef({});

    const dismissToast = useCallback((id) => {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((notification) => {
    const id = notification.id ?? crypto.randomUUID();

    // Ignore if this notification is already in the stack
    setToasts(prev => {
        if (prev.some(t => t.id === id)) return prev;

        const next = [{ ...notification, id }, ...prev];
        const dropped = next.slice(MAX_TOASTS);
        dropped.forEach(t => {
            clearTimeout(timersRef.current[t.id]);
            delete timersRef.current[t.id];
        });
        return next.slice(0, MAX_TOASTS);
    });

    if (timersRef.current[id]) return; // timer already set, duplicate event

    timersRef.current[id] = setTimeout(() => {
        dismissToast(id);
    }, AUTO_DISMISS_MS);
}, [dismissToast]);

    return (
        <NotificationToastContext.Provider value={{ toasts, addToast, dismissToast }}>
            {children}
        </NotificationToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(NotificationToastContext);
    if (!ctx) throw new Error('useToast must be used inside NotificationToastProvider');
    return ctx;
};
