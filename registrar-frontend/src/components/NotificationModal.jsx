import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const NotificationItem = ({ notif, onClick }) => {
  const { isUnread, statusColor, category, time, title, message } = notif;

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 cursor-pointer transition-all border-b border-white/3 group relative sm:px-5 sm:py-4"
    >
      {/* Status Dot */}
      <div className="mt-1.5 shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ring-4 ring-black/20 sm:w-3 sm:h-3 ${
            isUnread ? statusColor : 'bg-white/10'
          }`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-colors ${
            isUnread ? 'text-pup-yellow' : 'text-white/20'
          }`}>
            {category}
          </span>
          <span className="text-[10px] font-bold text-white/20 ml-2 shrink-0 group-hover:text-white/40 transition-colors">
            {time}
          </span>
        </div>

        <h3 className={`text-[12px] leading-snug mb-0.5 transition-colors sm:text-[13px] ${
          isUnread ? 'text-white font-bold' : 'text-white/30 font-medium'
        }`}>
          {title}
        </h3>
        <p className={`text-[11px] leading-normal line-clamp-2 transition-colors sm:text-[12px] ${
          isUnread ? 'text-white/80' : 'text-white/20'
        }`}>
          {message}
        </p>
      </div>

      {/* Hover Accent Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-pup-yellow scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />
    </div>
  );
};


const NotificationModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifs, setNotifs] = useState([
    { id: 1, category: 'Important', title: 'Juan Dela Cruz', message: 'Submitted a new Transcript of Records request.', time: '2m ago', isUnread: true, statusColor: 'bg-rose-600' },
    { id: 2, category: 'Reminder', title: 'Maria Garcia', message: 'Document "Good Moral Certificate" is now overdue.', time: '1h ago', isUnread: true, statusColor: 'bg-pup-yellow' },
    { id: 3, category: 'System', title: 'System Update', message: 'Weekly analytics report for February is now available.', time: '5h ago', isUnread: false, statusColor: 'bg-blue-400' },
  ]);
  const [activeTab, setActiveTab] = useState('all');

  const unreadCount = useMemo(() => notifs.filter(n => n.isUnread).length, [notifs]);
  const filteredNotifs = useMemo(() => {
    if (activeTab === 'unread') return notifs.filter(n => n.isUnread);
    return notifs;
  }, [activeTab, notifs]);

  if (!isOpen) return null;

  const handleNotifClick = (id) => {
    const clickedNotif = notifs.find((n) => n.id === id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isUnread: false } : n));

    if (clickedNotif) {
      const roleRoot = location.pathname.split('/')[1];
      const validRoleRoots = ['student', 'alumni', 'staff', 'super-admin'];
      const targetRoleRoot = validRoleRoots.includes(roleRoot) ? roleRoot : 'student';

      navigate(`/${targetRoleRoot}/inbox`, {
        state: {
          selectedNotificationId: clickedNotif.id,
          notification: clickedNotif,
        },
      });
      onClose();
    }
  };

  const markAllAsRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, isUnread: false })));
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />

      <div className="
        absolute top-full right-3 w-[min(350px,calc(100vw-1rem))]
        rounded-[1.25rem] overflow-hidden
        bg-pup-dark-maroon border border-white/10
        shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]
        ring-1 ring-white/5 z-50
        animate-in fade-in slide-in-from-top-3 duration-200
        sm:right-4 sm:w-95 sm:rounded-3xl
      ">

        {/* Header */}
        <div className="px-4 py-4 bg-[#510400] border-b border-white/5 sm:p-5">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2 sm:text-xl">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-pup-yellow text-pup-maroon text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </h2>
            <button onClick={markAllAsRead} title="Mark all as read" className="hover:scale-110 transition-transform">
              <CheckCircleIcon className="w-4 h-4 text-white hover:text-pup-yellow transition-colors sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <TabButton label="All" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
            <TabButton label="Unread" active={activeTab === 'unread'} onClick={() => setActiveTab('unread')} />
          </div>
        </div>

        {/* List */}
        <div className="max-h-70 overflow-y-auto custom-scrollbar sm:max-h-105">
          {filteredNotifs.length > 0 ? (
            filteredNotifs.map(notif => (
              <NotificationItem
                key={notif.id}
                notif={notif}
                onClick={() => handleNotifClick(notif.id)}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#510400] border-t border-white/5 flex justify-center sm:p-4">
        </div>
      </div>
    </>
  );
};

/* =========================================
   UI HELPERS
   ========================================= */
const TabButton = ({ label, active = false, onClick }) => (
  <button onClick={onClick} className={`px-3 py-1 text-[10px] font-black rounded-xl uppercase tracking-wider transition-all sm:px-4 sm:py-1.5 sm:text-[11px] ${
    active
      ? "bg-pup-yellow text-pup-maroon shadow-lg shadow-pup-yellow/10"
      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
  }`}>
    {label}
  </button>
);

const EmptyState = () => (
  <div className="p-8 text-center sm:p-10">
    <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No notifications</p>
  </div>
);

export default NotificationModal;