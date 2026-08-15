import React, { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTheme } from "../context/ThemeContext";
import { useHeaderResponsiveState } from '../utils/helpers';

const SuccessToast = ({ message, onClose }) => {
  const [duration, setDuration] = useState(5000);
  const toastRef = useRef(null);
  const { isDark } = useTheme();
  const { headerHeight } = useHeaderResponsiveState(!!message);

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
      style={{
        top: `${headerHeight + 16}px`,
      }}
      className={`fixed left-1/2 -translate-x-1/2 md:left-auto md:right-5 md:translate-x-0 z-200000 flex items-center w-[calc(100vw-24px)] md:w-85 px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-top-2 md:slide-in-from-right-4 fade-in duration-300 transition-all duration-300 ${
        isDark 
          ? 'text-[#e4e6eb] bg-[#242526] border border-[#3e4042]' 
          : 'text-white bg-green-600 border border-white/20'
      }`}
    >
      {/* Icon */}
      <div className={`flex items-center justify-center w-9 h-9 rounded-md shrink-0 ${
        isDark 
          ? 'text-green-400 bg-[#1a1b1e]' 
          : 'text-green-600 bg-white'
      }`}>
        <CheckCircleIcon className="w-6 h-6" strokeWidth={2.5} />
      </div>

      {/* Message */}
      <div className="ml-3 text-sm font-semibold leading-snug flex-1">
        {message}
      </div>

      {/* Close Button */}
      <button 
        onClick={onClose}
        className={`ml-3 p-1.5 rounded-md transition-colors ${
          isDark ? 'hover:bg-white/6' : 'hover:bg-white/10'
        }`}
      >
        <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* Progress Bar */}
      <div className={`absolute bottom-0 left-0 h-0.75 rounded-b-lg overflow-hidden w-full ${isDark ? 'bg-white/10' : 'bg-white/40'}`}>
        <div
          className={`h-full ${isDark ? 'bg-green-400' : 'bg-white'}`}
          style={{
            width: '100%',
            animation: `shrink ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
};

export default SuccessToast;