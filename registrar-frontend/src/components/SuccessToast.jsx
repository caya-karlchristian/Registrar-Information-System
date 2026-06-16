import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useHeaderResponsiveState } from '../utils/helpers';

const SuccessToast = ({ message, onClose }) => {
  const [duration, setDuration] = useState(5000);
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

  if (!message) return null;

  return (
    <div
      style={{
        top: `${headerHeight + 16}px`,
      }}
      className="fixed left-1/2 -translate-x-1/2 md:left-auto md:right-5 md:translate-x-0 z-9999 flex items-center w-[calc(100vw-24px)] md:w-[340px] px-4 py-3 text-white bg-green-600 rounded-lg shadow-xl border border-white/20 animate-in slide-in-from-top-2 md:slide-in-from-right-4 fade-in duration-300"
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-9 h-9 text-green-600 bg-white rounded-md">
        <CheckCircleIcon className="w-6 h-6" strokeWidth={2.5} />
      </div>

      {/* Message */}
      <div className="ml-3 text-sm font-semibold leading-snug">
        {message}
      </div>

      {/* Close Button */}
      <button 
        onClick={onClose}
        className="ml-3 p-1.5 rounded-md hover:bg-white/10 transition-colors"
      >
        <XMarkIcon className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-0.75 bg-white/40 rounded-b-lg overflow-hidden w-full">
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

export default SuccessToast;