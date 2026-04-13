import React, { useEffect, useState } from 'react';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ErrorToast = ({ message, onClose }) => {
  const [duration, setDuration] = useState(5000);

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

  if (!message) return null;

  return (
<div className="fixed top-30 right-4 lg:right-9 md:right-8 z-[9999] flex items-center w-auto max-w-sm px-4 py-3 text-white bg-pup-maroon rounded-lg shadow-xl border border-white/20 animate-slide-in-right">
  
  <div className="flex items-center justify-center w-9 h-9 text-pup-maroon bg-white rounded-md">
    <ExclamationCircleIcon className="w-9 h-7" strokeWidth={2.5} />
  </div>

  <div className="ml-3 text-sm font-semibold leading-snug">
    {message}
  </div>

  <button 
    onClick={onClose}
    className="ml-3 p-1.5 rounded-md hover:bg-white/10 transition-colors"
  >
    <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
  </button>

  <div className="absolute bottom-0 left-0 h-[3px] bg-white/40 rounded-b-lg overflow-hidden w-full">
    <div
      className="h-full bg-white"
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