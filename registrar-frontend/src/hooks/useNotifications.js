
mport { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthProvider';
import echo from '../services/echo';
import api from '../services/api';

// -------------------------------------------------------
// useNotifications — manages notification state for the
// current user. Subscribes to the correct private channel
// based on role (personal + admin channel for staff).
// -------------------------------------------------------
export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications]   = useState([]);
    const [unreadCount, setUnreadCount]       = useState(0);
    const [loading, setLoading]               = useState(true);

    // -------------------------------------------------------
    // Fetch existing notifications from REST API on mount
    // -------------------------------------------------------
    const fetchNotifications = useCallback(async () => {
        try {
            const [notifRes, countRes] = await Promise.all([
                api.get('/notifications'),
                api.get('/notifications/unread-count'),
            ]);
            setNotifications(notifRes.data.data ?? []);
            setUnreadCount(countRes.data.unread_count ?? 0);
        } catch (err) {
            console.error('[useNotifications] fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // -------------------------------------------------------
    // Mark a single notification as read
    // -------------------------------------------------------
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

    // -------------------------------------------------------
    // Mark all notifications as read
    // -------------------------------------------------------
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

    // -------------------------------------------------------
    // Dismiss (soft delete) a notification
    // -------------------------------------------------------
    const dismiss = useCallback(async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(prev => {
                const waUnread = notifications.find(n => n.id === id && !n.read_at);
                return waUnread ? Math.max(0, prev - 1) : prev;
            });
        } catch (err) {
            console.error('[useNotifications] dismiss failed:', err);
        }
    }, [notifications]);

    // -------------------------------------------------------
    // WebSocket subscriptions
    // -------------------------------------------------------
    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        // Every user gets their own private channel
        const personalChannel = echo
            .private(`notifications.${user.user_id}`)
            .listen('NotificationSent', (e) => {
                setNotifications(prev => [e.notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            });

        // Staff also listen on the shared admin channel
        const isStaff = ['admin', 'super_admin'].includes(user.role_name);
        const adminChannel = isStaff
            ? echo.private('admin.notifications').listen('NotificationSent', (e) => {
                setNotifications(prev => [e.notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            })
            : null;

        // Cleanup on unmount or user change
        return () => {
            echo.leave(`notifications.${user.user_id}`);
            if (isStaff) echo.leave('admin.notifications');
        };
    }, [user?.user_id]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        dismiss,
        refetch: fetchNotifications,
    };
};