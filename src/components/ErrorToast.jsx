import React, { useEffect } from 'react';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ErrorToast = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {

      const displayTime = message.length > 60 ? 8000 : 5000;

      const timer = setTimeout(() => {
        onClose();
      }, displayTime);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex items-center w-[calc(100%-2.5rem)] max-w-sm p-4 text-white bg-pup-maroon rounded-xl shadow-2xl border border-white/20 animate-slide-in">
      <div className="inline-flex items-center justify-center shrink-0 w-10 h-10 text-pup-maroon bg-white rounded-lg shadow-inner">
        <ExclamationCircleIcon className="w-6 h-6" strokeWidth={2.5} />
      </div>

      <div className="ml-3 text-sm font-bold leading-tight">
        {message}
      </div>

      <button 
        onClick={onClose}
        className="ml-auto -mx-1.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors inline-flex items-center justify-center"
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
      </button>

      <div className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl animate-progress-bar" />
    </div>
  );
};

export default ErrorToast;