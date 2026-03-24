import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthProvider';
import echo from '../services/echo';

const NotificationToastContext = createContext(null);

const AUTO_DISMISS_MS = 5000;
const MAX_TOASTS      = 3;

export const NotificationToastProvider = ({ children }) => {
    const { user } = useAuth();
    const [toasts, setToasts]   = useState([]);
    const timersRef             = useRef({});

    const dismissToast = useCallback((id) => {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((notification) => {
        console.log('[Toast] addToast called:', notification); // DEBUG
        const id = notification.id ?? crypto.randomUUID();

        setToasts(prev => {
            const next = [{ ...notification, id }, ...prev];
            const dropped = next.slice(MAX_TOASTS);
            dropped.forEach(t => {
                clearTimeout(timersRef.current[t.id]);
                delete timersRef.current[t.id];
            });
            return next.slice(0, MAX_TOASTS);
        });

        timersRef.current[id] = setTimeout(() => {
            dismissToast(id);
        }, AUTO_DISMISS_MS);
    }, [dismissToast]);

    useEffect(() => {
        console.log('[Toast] useEffect fired, user:', user?.user_id, user?.role_name); // DEBUG

        if (!user) {
            console.log('[Toast] no user, skipping Echo subscription'); // DEBUG
            return;
        }

        const isStaff = ['admin', 'super_admin'].includes(user.role_name);
        console.log('[Toast] subscribing to channel: notifications.' + user.user_id); // DEBUG

        echo.private(`notifications.${user.user_id}`)
            .listen('.NotificationSent', (e) => {
                console.log('[Toast] NotificationSent received:', e); // DEBUG
                addToast(e);
            });

        if (isStaff) {
            console.log('[Toast] subscribing to admin.notifications'); // DEBUG
            echo.private('admin.notifications')
                .listen('.NotificationSent', (e) => {
                    console.log('[Toast] admin NotificationSent received:', e); // DEBUG
                    addToast(e);
                });
        }

        return () => {
            console.log('[Toast] cleanup — leaving channels'); // DEBUG
            echo.leave(`notifications.${user.user_id}`);
            if (isStaff) echo.leave('admin.notifications');
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