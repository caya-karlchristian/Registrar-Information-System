import React, { useEffect, useRef, useState } from 'react';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from "../context/ThemeContext";

const ErrorToast = ({ message, onClose }) => {
  const [duration, setDuration] = useState(5000);
  const toastRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (message) {
      const displayTime = message.length > 60 ? 5000 : 3000;
      setDuration(displayTime);

      const timer = setTimeout(() => {
        onClose();
      }, displayTime);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (toastRef.current && !toastRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (message) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      ref={toastRef}
      className={`fixed toast-container-shifted right-3 lg:right-5 md:right-5 z-9999 flex items-center w-auto max-w-sm px-4 py-3 rounded-lg shadow-xl animate-slide-in-right ${isDark ? 'text-[#e4e6eb] bg-[#242526] border border-[#3e4042]' : 'text-white bg-pup-maroon border border-white/20'}`}
    >
      <div className={`flex items-center justify-center w-9 h-9 rounded-md ${isDark ? 'text-[#FFC72C] bg-[#1a1b1e]' : 'text-pup-maroon bg-white'}`}>
        <ExclamationCircleIcon className="w-9 h-7" strokeWidth={2.5} />
      </div>
      <div className="ml-3 text-sm font-semibold leading-snug">
        {message}
      </div>
      <button 
        onClick={onClose}
        className={`ml-3 p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-white/6' : 'hover:bg-white/10'}`}
      >
        <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <div className={`absolute bottom-0 left-0 h-0.75 rounded-b-lg overflow-hidden w-full ${isDark ? 'bg-white/10' : 'bg-white/40'}`}>
        <div
          className={`h-full ${isDark ? 'bg-pup-yellow' : 'bg-white'}`}
          style={{
            width: '100%',
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
};

export default ErrorToast;