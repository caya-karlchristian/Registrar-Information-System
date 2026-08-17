import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthProvider';
import { getEcho, resetEcho } from '../services/echo';
import api from '../services/api';

// True in `vite dev` / `vite build --mode development`, false in a
// production build — so these Echo debug logs are available locally
// but never ship to prod/staging consoles.
const DEBUG_ECHO = import.meta.env.DEV;

export const useNotifications = (onNewNotification = null) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [loading, setLoading]             = useState(true);
    const [loadingMore, setLoadingMore]     = useState(false);
    const [hasMore, setHasMore]             = useState(false);
    const pageRef                           = useRef(1);

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
            // Reset to page 1 on every full refresh (login, user switch, refetch).
            pageRef.current = 1;
            const [notifRes, countRes] = await Promise.all([
                api.get('/notifications', { params: { page: 1 } }),
                api.get('/notifications/unread-count'),
            ]);
            const meta = notifRes.data.meta ?? {};
            setNotifications(notifRes.data.data ?? []);
            setUnreadCount(countRes.data.count ?? 0);
            // hasMore is true when the backend has at least one more page.
            setHasMore((meta.current_page ?? 1) < (meta.last_page ?? 1));
        } catch (err) {
            console.error('[useNotifications] fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Append the next page of notifications to the existing list.
    // Keeps real-time items that arrived via WebSocket at the top untouched.
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        try {
            setLoadingMore(true);
            const nextPage = pageRef.current + 1;
            const { data } = await api.get('/notifications', { params: { page: nextPage } });
            const meta = data.meta ?? {};
            // Deduplicate: WebSocket may have prepended items already on this page.
            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const fresh = (data.data ?? []).filter(n => !existingIds.has(n.id));
                return [...prev, ...fresh];
            });
            pageRef.current = nextPage;
            setHasMore((meta.current_page ?? nextPage) < (meta.last_page ?? nextPage));
        } catch (err) {
            console.error('[useNotifications] loadMore failed:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore]);

    const markAsRead = useCallback(async (id) => {
        try {
            // Controller now returns unread_count — no need for a second fetch.
            const { data } = await api.post(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
            );
            setUnreadCount(data.unread_count ?? 0);
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
            // Controller now returns unread_count — no need for a second fetch.
            const { data } = await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(data.unread_count ?? 0);
        } catch (err) {
            console.error('[useNotifications] dismiss failed:', err);
        }
    }, []);

    const prevUserIdRef = useRef(null);
    
    const fetchNotificationsRef = useRef(fetchNotifications);
    useEffect(() => { fetchNotificationsRef.current = fetchNotifications; }, [fetchNotifications]);

    useEffect(() => {
        if (!user) return;
        fetchNotificationsRef.current();

        if (prevUserIdRef.current !== user.user_id) {
            resetEcho();
            prevUserIdRef.current = user.user_id;
        }

        const echo = getEcho();
        if (!echo) {
            console.error('[useNotifications] Echo unavailable — VITE_REVERB_HOST or VITE_REVERB_APP_KEY missing.');
            return;
        }

        // The WebSocket event (NotificationSent::broadcastWith()) is
        // intentionally lean — it carries enough to show a toast/badge
        // instantly, but omits larger/sensitive fields (requirements
        // checklist, claim_code, announcement body) to keep the broadcast
        // queue fast and avoid pushing sensitive data over the socket
        // transport. Treat `e` as a signal, not the canonical record:
        // render the stub immediately for a snappy UI, then hydrate it
        // via the same REST shape (NotificationResource) that
        // fetchNotifications() already uses, so a full reload is never
        // required to see fields the socket payload doesn't carry.
        const handleNewNotification = async (e) => {
            setNotifications(prev => {
                if (prev.some(n => n.id === e.id)) return prev; // deduplicate
                return [e, ...prev]; // optimistic stub
            });
            setUnreadCount(c => c + 1);
            if (typeof onNewNotificationRef.current === 'function') onNewNotificationRef.current(e);

            try {
                const { data } = await api.get(`/notifications/${e.id}`);
                setNotifications(prev =>
                    prev.map(n => (n.id === e.id ? data.data : n))
                );
            } catch (err) {
                // Stub stays in place (title/message still correct) — the
                // extra fields just won't appear until the next full refetch.
                console.error('[useNotifications] hydrate failed:', err);
            }
        };

        const channelName = `notifications.${user.user_id}`;

        // Hoist the flag to effect scope so the cleanup return can always
        // reach it — previously declared inside the else block, which put it
        // out of scope of the return () => { ... } teardown function.
        let unsubscribed = false;

        const subscribe = () => {
            if (DEBUG_ECHO) console.info('[Echo] subscribing to', channelName);
            echo.private(channelName)
                .listen('.NotificationSent', handleNewNotification)
                .error((err) => {
                    if (DEBUG_ECHO) console.error('[Echo] private channel auth failed:', err);
                });
        };

        const connectionState = echo.connector.pusher.connection.state;

        // -------------------------------------------------------
        // RECONNECT RECOVERY
        // -------------------------------------------------------
        // If the WebSocket drops and reconnects (mobile sleep, network
        // blip, server restart), any notifications pushed during the
        // gap are silently missed. Re-fetching on reconnect fills
        // the gap via REST; the existing deduplication prevents doubles.
        // We bind to 'state_change' persistently so every reconnect
        // triggers a refresh for the lifetime of this effect.
        // -------------------------------------------------------
        const handleStateChange = ({ current, previous }) => {
            if (DEBUG_ECHO) console.info(`[Echo] connection → ${current}`);
            // 'disconnected' → 'connected' means a real reconnect after a drop.
            // Skip initialized → connected (first-ever connect) because
            // fetchNotifications() already ran at effect start above.
            if (current === 'connected' && previous === 'disconnected') {
                if (DEBUG_ECHO) console.info('[Echo] reconnected — refreshing missed notifications');
                fetchNotifications();
            }
        };
        echo.connector.pusher.connection.bind('state_change', handleStateChange);

        // Store the onConnected handler outside the else block so the cleanup
        // function can unbind it by reference. Previously unbind('connected')
        // was called with no second argument, which removes ALL 'connected'
        // listeners — including Pusher-js's own internal reconnect handler.
        // On the two-tabs-same-machine scenario this caused the first tab's
        // connection to stop receiving reconnect events after the second tab
        // mounted or unmounted, making notifications appear only intermittently.
        let pendingConnectedHandler = null;

        if (connectionState === 'connected') {
            subscribe();
        } else {
            pendingConnectedHandler = () => {
                echo.connector.pusher.connection.unbind('connected', pendingConnectedHandler);
                pendingConnectedHandler = null;
                if (!unsubscribed) subscribe();
            };
            echo.connector.pusher.connection.bind('connected', pendingConnectedHandler);
        }

        return () => {
            unsubscribed = true;
            // Unbind only OUR listeners by reference — never the bare
            // unbind() which strips every listener on the connection.
            echo.connector.pusher.connection.unbind('state_change', handleStateChange);
            if (pendingConnectedHandler) {
                echo.connector.pusher.connection.unbind('connected', pendingConnectedHandler);
                pendingConnectedHandler = null;
            }
            echo.leave(channelName);
        };
    }, [user?.user_id]);

    return {
        notifications,
        unreadCount,
        loading,
        loadingMore,
        hasMore,
        loadMore,
        markAsRead,
        markAllAsRead,
        dismiss,
        refetch: fetchNotifications,
    };
};