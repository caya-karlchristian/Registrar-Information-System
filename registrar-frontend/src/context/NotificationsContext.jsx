import { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from './NotificationToastContext';
import { useAuth } from './AuthProvider';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
    const { addToast } = useToast();
    const { user } = useAuth();
    // Pass user into useNotifications so the Echo subscription only
    // fires after the user is authenticated. Without this guard, the
    // provider mounts on /auth/callback and / as well, and the Pusher
    // connector tries to touch the WebSocket mid-navigation — which is
    // what causes "Prevented … from accessing QueryParameters" on
    // /student and /student/home after SSO login.
    const value = useNotifications(addToast);

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotificationsContext = () => {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotificationsContext must be used inside NotificationsProvider');
    return ctx;
};
