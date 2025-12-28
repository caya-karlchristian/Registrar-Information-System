import React, { useState, useEffect } from "react";
import { BellAlertIcon, XMarkIcon } from "@heroicons/react/16/solid";

const NotificationSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // REMINDER: REMOVE WHEN BACKEND AND DATABASE INTEGRATION
  const  [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Document Ready to Claim",
      message: "Your Transcript of Records (TOR) is now available at the Registrar's Office.",
      time: "2 hours ago",
      type: "claim", 
      isRead: false,
    },
    {
      id: 2,
      title: "Request Approved",
      message: "Your application for Honorable Dismissal has been approved.",
      time: "5 hours ago",
      type: "reminder",
      isRead: false,
    },
  ]);

  const handleNotificationClick = (id) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };


  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 mr-4 hover:bg-gray-100 rounded-full transition-colors relative focus:outline-none"
      >
        <BellAlertIcon className="w-7 h-7 text-pup-maroon" />

        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* --- SIDEBAR OVERLAY & PANEL --- */}
      <div 
        className={`fixed inset-0 z-50 transform transition-opacity duration-300 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div 
          className={`absolute top-0 right-0 h-full w-80 md:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="bg-pup-maroon p-5 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg tracking-wide">Notifications</h3>
                {unreadCount > 0 && (
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full border border-white/10">
                    {unreadCount} New
                </span>
                )}
            </div>
            
            {/* Close Button */}
            <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
            >
             <XMarkIcon className="w-7 h-7 text-white"/>   
            </button>
          </div>

          {/* Scrollable Content AND Mark as read */}
          <div className="h-[calc(100%-80px)] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNotificationClick(item.id)}
                  className={`p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group relative ${
                    item.isRead ? "bg-white" : "bg-red-50/40"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Status Icon */}
                    <div className="mt-1 shrink-0">
                      {item.type === "claim" && (
                         <div className="w-2 h-2 mt-2 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                      )}
                      {item.type === "reminder" && (
                         <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 ring-4 ring-blue-100"></div>
                      )}
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <p className={`text-sm ${item.isRead ? 'font-semibold text-gray-700' : 'font-bold text-pup-maroon'}`}>
                                {item.title}
                            </p>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                {item.time}
                            </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${item.isRead ? 'text-gray-500' : 'text-gray-800'}`}>
                            {item.message}
                        </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                <BellAlertIcon className="w-10 h-10 text-gray-400"/>
                 <p>No new notifications</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default NotificationSidebar;


