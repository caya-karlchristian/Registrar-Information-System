import React, { useEffect } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SuccessToast = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex items-center w-full max-w-sm p-4 text-white bg-green-600 rounded-lg shadow-lg animate-in fade-in slide-in-from-right-5 duration-300">
      <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 text-green-600 bg-white rounded-lg">
        <CheckCircleIcon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="ml-3 text-sm font-semibold">{message}</div>
      <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg p-1.5 inline-flex h-8 w-8 items-center justify-center transition-colors">
        <XMarkIcon className="w-5 h-5" strokeWidth={2} />
      </button>
    </div>
  );
};

export default SuccessToast;