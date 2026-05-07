import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthProvider';
import { getEcho, resetEcho } from '../services/echo';
import api from '../services/api';

export const useNotifications = (onNewNotification = null) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [loading, setLoading]             = useState(true);

    // Keep a ref that always points at the latest callback so the Echo
    // subscription effect does not need to depend on it — this prevents
    // the channel from being left/re-joined whenever the callback identity
    // changes (e.g. if the caller ever forgets useCallback).
    const onNewNotificationRef = useRef(onNewNotification);
    useEffect(() => {
        onNewNotificationRef.current = onNewNotification;
    }, [onNewNotification]);

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
            // Fetch the authoritative count from the server rather than
            // guessing — prevents drift when the notification was already
            // read in another tab or via markAllAsRead.
            const { data } = await api.get('/notifications/unread-count');
            setUnreadCount(data.count ?? 0);
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
            // Read the snapshot, then update both states at the same level —
            // calling setState inside another setState's updater fn is unsafe
            // in React's concurrent renderer (the inner call can be dropped
            // if the updater is replayed).
            setNotifications(prev => prev.filter(n => n.id !== id));
            // Sync the authoritative count from the server so we stay correct
            // regardless of whether the dismissed notification was read or not.
            const { data } = await api.get('/notifications/unread-count');
            setUnreadCount(data.count ?? 0);
        } catch (err) {
            console.error('[useNotifications] dismiss failed:', err);
        }
    }, []);

    // Track the previous user_id so we only reset Echo when the user
    // actually changes (login/logout), not on every effect re-run.
    const prevUserIdRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        // Reset the singleton ONLY when the user identity changes so each
        // new login gets a fresh WebSocket connection with the current token.
        // Resetting on every run would cause a connect→disconnect→connect
        // flap on re-renders and navigation, which drops in-flight events.
        if (prevUserIdRef.current !== user.user_id) {
            resetEcho();
            prevUserIdRef.current = user.user_id;
        }
        const echo = getEcho();
        if (!echo) {
            // Env vars were missing at build time — see vite.config.js and Dockerfile.
            // Notifications will still load via REST; real-time push is unavailable.
            console.error('[useNotifications] Echo unavailable — VITE_REVERB_HOST or VITE_REVERB_APP_KEY missing.');
            return;
        }

        const handleNewNotification = (e) => {
            setNotifications(prev => {
                if (prev.some(n => n.id === e.id)) return prev; // deduplicate
                setUnreadCount(c => c + 1);
                if (typeof onNewNotificationRef.current === 'function') onNewNotificationRef.current(e);
                return [e, ...prev];
            });
        };

        const channelName = `notifications.${user.user_id}`;

        const subscribe = () => {
            console.info('[Echo] subscribing to', channelName);
            echo.private(channelName)
                .listen('.NotificationSent', handleNewNotification)
                .error((err) => {
                    console.error('[Echo] private channel auth failed:', err);
                });
        };

        const connectionState = echo.connector.pusher.connection.state;

        // Log all connection state transitions so failures are visible in DevTools.
        echo.connector.pusher.connection.bind('state_change', ({ current }) => {
            console.info(`[Echo] connection → ${current}`);
        });

        if (connectionState === 'connected') {
            // Already connected (e.g. navigating between pages with same user) —
            // subscribe immediately, no need to wait for the handshake.
            subscribe();
        } else {
            // Connection is still being established (fresh login, page reload).
            // Wait for the 'connected' event before subscribing to the private
            // channel — subscribing too early causes the channel auth request
            // (/api/broadcasting/auth) to race against the WS handshake and
            // intermittently fail with a 401 even though the token is valid.
            //
            // unsubscribed flag: if the component unmounts before the WS
            // handshake completes, the cleanup return below sets this to true
            // and the onConnected callback becomes a no-op.  Without this guard
            // the callback fires into a dead closure and can create a duplicate
            // subscription when the component remounts (e.g. after SSO redirect).
            let unsubscribed = false;
            const onConnected = () => {
                echo.connector.pusher.connection.unbind('connected', onConnected);
                if (!unsubscribed) subscribe();
            };
            echo.connector.pusher.connection.bind('connected', onConnected);
        }

        return () => {
            unsubscribed = true;
            // Remove the pending onConnected listener so it can never fire
            // after cleanup — covers the race where unmount happens while the
            // WS handshake is still in progress (common during SSO redirects).
            echo.connector.pusher.connection.unbind('connected');
            echo.leave(channelName);
        };
    }, [user?.user_id, fetchNotifications]);

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss, refetch: fetchNotifications };
};