import React, { useState, useMemo } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const NotificationItem = ({ notif, onClick }) => {
  const { isUnread, statusColor, category, time, title, message } = notif;

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.03] cursor-pointer transition-all border-b border-white/[0.03] group relative"
    >
      {/* Status Dot */}
      <div className="mt-1.5 shrink-0">
        <div 
          className={`w-3 h-3 rounded-full transition-all duration-300 ring-4 ring-black/20 ${
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
          <span className="text-[10px] font-bold text-white/20 group-hover:text-white/40 transition-colors">
            {time}
          </span>
        </div>

        <h3 className={`text-[13px] leading-snug mb-0.5 transition-colors ${
          isUnread ? 'text-white font-bold' : 'text-white/30 font-medium'
        }`}>
          {title}
        </h3>
        <p className={`text-[12px] leading-normal line-clamp-2 transition-colors ${
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
  const [notifs, setNotifs] = useState([
    { id: 1, category: 'Important', title: 'Juan Dela Cruz', message: 'Submitted a new Transcript of Records request.', time: '2m ago', isUnread: true, statusColor: 'bg-rose-600' },
    { id: 2, category: 'Reminder', title: 'Maria Garcia', message: 'Document "Good Moral Certificate" is now overdue.', time: '1h ago', isUnread: true, statusColor: 'bg-pup-yellow' },
    { id: 3, category: 'System', title: 'System Update', message: 'Weekly analytics report for February is now available.', time: '5h ago', isUnread: false, statusColor: 'bg-blue-400' },
  ]);

  const unreadCount = useMemo(() => notifs.filter(n => n.isUnread).length, [notifs]);

  if (!isOpen) return null;

  const handleNotifClick = (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isUnread: false } : n));
  };

  const markAllAsRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, isUnread: false })));
  };


  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />

      <div className="absolute top-full right-4 w-[380px] bg-pup-dark-maroon border border-white/10 rounded-[1.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] z-50 animate-in fade-in slide-in-from-top-3 duration-200 overflow-hidden ring-1 ring-white/5">
        
        {/* Header Section */}
        <div className="p-5 bg-[#510400] from-white/[0.05] to-transparent border-b border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-xl font-black tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-pup-yellow text-pup-maroon text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </h2>
            <button onClick={markAllAsRead} title="Mark all as read" className="hover:scale-110 transition-transform">
              <CheckCircleIcon className="w-5 h-5 text-white hover:text-pup-yellow transition-colors" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <TabButton label="All" active />
            <TabButton label="Unread" />
          </div>
        </div>

        {/* List Section */}
        <div className="max-h-[420px] overflow-y-auto custom-scrollbar bg-black-500/20 pr-1">
          {notifs.length > 0 ? (
            notifs.map(notif => (
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

        <div className="p-4 bg-[#510400] border-t border-white/5 flex justify-center">
        </div>
      </div>
    </>
  );
};

/* =========================================
   UI HELPERS
   ========================================= */
const TabButton = ({ label, active = false }) => (
  <button className={`px-4 py-1.5 text-[11px] font-black rounded-xl uppercase tracking-wider transition-all ${
    active 
      ? "bg-pup-yellow text-pup-maroon shadow-lg shadow-pup-yellow/10" 
      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
  }`}>
    {label}
  </button>
);

const EmptyState = () => (
  <div className="p-10 text-center">
    <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No notifications</p>
  </div>
);

export default NotificationModal;