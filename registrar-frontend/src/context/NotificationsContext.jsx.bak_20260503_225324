import { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from './NotificationToastContext';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
    const { addToast } = useToast();
    const value = useNotifications(addToast); // ONE instance, ONE Echo subscription

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
