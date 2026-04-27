import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthProvider';
import { getEcho } from '../services/echo';
import api from '../services/api';

export const useNotifications = (onNewNotification = null) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [loading, setLoading]             = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const [notifRes, countRes] = await Promise.all([
                api.get('/notifications'),
                api.get('/notifications/unread-count'),
            ]);
            setNotifications(notifRes.data.data ?? []);
            setUnreadCount(countRes.data.count ?? 0);
        } catch (err) {
            console.error('[useNotifications] fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (id) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('[useNotifications] markAsRead failed:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error('[useNotifications] markAllAsRead failed:', err);
        }
    }, []);

    const dismiss = useCallback(async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => {
                const target = prev.find(n => n.id === id);
                if (target && !target.read_at) setUnreadCount(c => Math.max(0, c - 1));
                return prev.filter(n => n.id !== id);
            });
        } catch (err) {
            console.error('[useNotifications] dismiss failed:', err);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        const echo = getEcho();
        const isStaff = ['admin', 'super_admin'].includes(user.role_name);

        const handleNewNotification = (e) => {
    setNotifications(prev => {
        if (prev.some(n => n.id === e.id)) return prev; // duplicate, ignore
        setUnreadCount(c => c + 1); // only increment when it's actually new
        if (typeof onNewNotification === 'function') onNewNotification(e);
        return [e, ...prev];
    });
};

        echo.private(`notifications.${user.user_id}`)
            .listen('.NotificationSent', handleNewNotification);

        if (isStaff) {
            echo.private('admin.notifications')
                .listen('.NotificationSent', handleNewNotification);
        }

        return () => {
            echo.leave(`notifications.${user.user_id}`);
            if (isStaff) echo.leave('admin.notifications');
        };
    }, [user?.user_id]);

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss, refetch: fetchNotifications };
};
