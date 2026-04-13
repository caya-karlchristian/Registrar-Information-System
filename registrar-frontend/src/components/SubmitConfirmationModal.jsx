import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const SubmitConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-24 bottom-0 z-30 bg-black/50 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center lg:left-72 lg:w-[calc(100vw-18rem)]">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-xl sm:rounded-2xl shadow-2xl flex flex-col items-center justify-between p-5 sm:p-7 gap-5 sm:gap-6 animate-in fade-in zoom-in duration-200">
        
        {/* ICON */}
        <div className="p-3 sm:p-4 rounded-full bg-green-100 text-green-600">
          <CheckCircleIcon className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        {/* TEXT */}
        <div className="text-center space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            {message}
          </p>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-md transition-colors"
          >
            Submit
          </button>
        </div>

      </div>
    </div>
  );
};

export default SubmitConfirmationModal;