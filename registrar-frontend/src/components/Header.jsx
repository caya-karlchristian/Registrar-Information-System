import { useState } from "react";
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline'; 
import NotificationModal from "../components/NotificationModal.jsx";
import LogoImage from "../assets/puplogoimage.png";
import { useNotificationsContext as useNotifications } from "../context/NotificationsContext";
import { useToast } from "../context/NotificationToastContext.jsx";

function Header({ onMenuClick }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { addToast } = useToast();
  const { unreadCount } = useNotifications();

  return (
    <div className="relative w-full font-sans">
      <header className="bg-pup-dark-maroon w-full shadow-sm relative z-50 border-b-[5px] border-pup-yellow">        
        <div className="w-full px-4 py-4 flex justify-between items-center">          
          <div className="flex space-x-4">
            <img
              src={LogoImage}
              alt="PUP Logo"
              className="w-16 h-16 lg:w-20 lg:h-20"
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-white font-bold text-[14px] uppercase lg:text-[22px] leading-tight font-inter">
                POLYTECHNIC UNIVERSITY OF THE PHILIPPINES - TAGUIG CAMPUS
              </h1>
              <p className="text-white text-[10px] uppercase lg:text-[13px] font-inter">
                THE COUNTRY'S 1ST POLYTECHNIC
              </p>
            </div>
          </div>
          <div className="relative flex items-center space-x-2">
            {/* Notification Bell */}
            <button 
              className="p-2 hover:bg-red-900 rounded-full transition-colors relative group"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
            >
              <BellIcon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-white"></span>
                </span>
              )}
            </button>
            {/* Burger Button */}
            <button 
              className="p-2 hover:bg-red-900 rounded-full transition-colors lg:hidden text-pup-maroon"
              onClick={onMenuClick}
            >
              <Bars3Icon className="w-8 h-8 font-bold text-white" />
            </button>
          </div>
        </div>
      </header>
      <NotificationModal 
        isOpen={isNotifOpen} 
        onClose={() => setIsNotifOpen(false)} 
      />
    </div>
  );
}

export default Header;