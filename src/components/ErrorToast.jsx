import React from 'react';
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ErrorToast = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center w-full max-w-sm p-4 text-white bg-pup-maroon rounded-lg shadow-lg animate-bounce-in">
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-pup-maroon bg-white rounded-lg">
        <ExclamationCircleIcon className="w-5 h-5" strokeWidth={2} />
      </div>

      <div className="ml-3 text-sm font-normal">
        {message}
      </div>

      <button 
        onClick={onClose}
        className="ml-auto -mx-1.5 -my-1.5 bg-pup-maroon text-white hover:text-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex h-8 w-8 items-center justify-center"
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="w-5 h-5" strokeWidth={2} />
      </button>
    </div>
  );
};

export default ErrorToast;