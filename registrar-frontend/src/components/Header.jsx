import { useState } from "react";
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline'; 
import NotificationModal from "../components/NotificationModal.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import LogoImage from "../assets/puplogoimage.png";
import { useNotificationsContext as useNotifications } from "../context/NotificationsContext";
import { useTheme } from "../context/ThemeContext";


function Header({ onMenuClick }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { isDark } = useTheme();

  const headerStyle = {
    backgroundColor: isDark ? undefined : '#660000',
  };

  return (
    <header
      style={headerStyle}
      className="dark:bg-[#242526] w-full shadow-sm dark:shadow-lg fixed top-0 left-0 right-0 z-50 border-b-[5px] border-yellow-400 transition-all duration-200"
    >
      <div className="w-full px-4 py-4 flex justify-between items-center h-full">
        <div className="flex space-x-4 items-center">
          <img
            src={LogoImage}
            alt="PUP Logo"
            className="w-16 h-16 lg:w-20 lg:h-20 drop-shadow-lg dark:drop-shadow-2xl transition-all duration-200"
          />
          <div className="flex flex-col justify-center grow">
            <h1 className="text-white dark:text-white font-bold text-[12px] uppercase lg:text-[22px] leading-tight font-inter">
              POLYTECHNIC UNIVERSITY OF THE PHILIPPINES - TAGUIG CAMPUS
            </h1>
            <p className="text-white dark:text-gray-300 text-[9px] uppercase lg:text-[13px] font-inter">
              THE COUNTRY'S 1ST POLYTECHNIC
            </p>
          </div>
        </div>
        <div className="relative flex items-center space-x-2 lg:space-x-3">
          <ThemeToggle showLabel={false} />
          {/* Notification Bell */}
          <button
            className="p-2 hover:bg-red-900 dark:hover:bg-[#ffffff44] rounded-full transition-all duration-200 relative group backdrop-blur-sm"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Notifications"
          >
            <BellIcon className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-200" />

            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-red-600 dark:bg-red-500 border-2 border-white text-[10px] font-bold text-white shadow-lg dark:shadow-red-500/50">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          <button
            className="p-2 hover:bg-red-900 dark:hover:bg-[#ffffff44] rounded-full transition-all duration-200 lg:hidden text-white backdrop-blur-sm"
            onClick={onMenuClick}
            title="Menu"
          >
            <Bars3Icon className="w-8 h-8 font-bold" />
          </button>
        </div>
      </div>

      <NotificationModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </header>
  );
}

export default Header;