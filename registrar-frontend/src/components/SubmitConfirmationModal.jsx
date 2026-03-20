import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const SubmitConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm p-4 ml-50 mt-15">
      
      <div className="absolute top-1/2 left-1/2 w-100 h-80 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-between p-7 animate-in fade-in zoom-in duration-200 -translate-x-1/2 -translate-y-1/2 ml-[50px]">
        
        {/* ICON */}
        <div className="p-4 rounded-full bg-green-100 text-green-600">
          <CheckCircleIcon className="w-8 h-8" />
        </div>

        {/* TEXT */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">
            {title}
          </h3>
          <p className="text-sm text-gray-500 font-medium">
            {message}
          </p>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-md transition-colors"
          >
            Submit
          </button>
        </div>

      </div>
    </div>
  );
};

export default SubmitConfirmationModal;