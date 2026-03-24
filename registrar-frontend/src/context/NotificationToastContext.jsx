import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthProvider';
import echo from '../services/echo';

// -------------------------------------------------------
// NotificationToastContext
// -------------------------------------------------------
// Maintains a lean Echo subscription solely for real-time
// toast popups. Intentionally separate from useNotifications
// to avoid refactoring the existing bell/modal flow.
//
// Provides:
//   toasts       — array of active toast objects
//   dismissToast — (id) => void
// -------------------------------------------------------

const NotificationToastContext = createContext(null);

const AUTO_DISMISS_MS = 5000;
const MAX_TOASTS      = 3;

export const NotificationToastProvider = ({ children }) => {
    const { user } = useAuth();
    const [toasts, setToasts]   = useState([]);
    const timersRef             = useRef({});  // id → timeoutId

    // --------------------------------------------------
    // dismissToast — remove one toast by id
    // Also clears its auto-dismiss timer
    // --------------------------------------------------
    const dismissToast = useCallback((id) => {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // --------------------------------------------------
    // addToast — push a new notification onto the stack
    // Caps at MAX_TOASTS by dropping the oldest
    // --------------------------------------------------
    const addToast = useCallback((notification) => {
        const id = notification.id ?? crypto.randomUUID();

        setToasts(prev => {
            const next = [{ ...notification, id }, ...prev];
            // Drop oldest toasts beyond the cap
            const dropped = next.slice(MAX_TOASTS);
            dropped.forEach(t => {
                clearTimeout(timersRef.current[t.id]);
                delete timersRef.current[t.id];
            });
            return next.slice(0, MAX_TOASTS);
        });

        // Auto-dismiss after AUTO_DISMISS_MS
        timersRef.current[id] = setTimeout(() => {
            dismissToast(id);
        }, AUTO_DISMISS_MS);
    }, [dismissToast]);

    // --------------------------------------------------
    // Echo subscription — fires only on new WS events
    // Does NOT make API calls — purely real-time
    // --------------------------------------------------
    useEffect(() => {
        if (!user) return;

        const isStaff = ['admin', 'super_admin'].includes(user.role_name);

        echo.private(`notifications.${user.user_id}`)
            .listen('.NotificationSent', (e) => {
                addToast(e);
            });

        if (isStaff) {
            echo.private('admin.notifications')
                .listen('.NotificationSent', (e) => {
                    addToast(e);
                });
        }

        return () => {
            echo.leave(`notifications.${user.user_id}`);
            if (isStaff) echo.leave('admin.notifications');
            // Clear all pending timers on unmount
            Object.values(timersRef.current).forEach(clearTimeout);
            timersRef.current = {};
        };
    }, [user?.user_id]);

    return (
        <NotificationToastContext.Provider value={{ toasts, dismissToast }}>
            {children}
        </NotificationToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(NotificationToastContext);
    if (!ctx) throw new Error('useToast must be used inside NotificationToastProvider');
    return ctx;
};
