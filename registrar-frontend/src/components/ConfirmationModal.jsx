import React from 'react';
import { ExclamationTriangleIcon, ArrowRightStartOnRectangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'default' }) => {
  if (!isOpen) return null;

  const isDanger   = type === 'danger';
  const isConfirm  = type === 'confirm';

  const iconClass = isDanger ? 'bg-red-100 text-red-600' : isConfirm ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600';
  const btnClass  = isDanger ? 'bg-red-600 hover:bg-red-700' : isConfirm ? 'bg-[#800000] hover:bg-[#3a0303]' : 'bg-blue-600 hover:bg-blue-700';
  const btnLabel  = isDanger ? 'Delete' : isConfirm ? 'Confirm' : 'Logout';

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ml-50">
      <div className="w-100 h-80 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-between p-7 animate-in fade-in zoom-in duration-200">

        <div className={`p-4 rounded-full ${iconClass}`}>
          {isDanger ? (
            <ExclamationTriangleIcon className="w-8 h-8" />
          ) : isConfirm ? (
            <QuestionMarkCircleIcon className="w-8 h-8" />
          ) : (
            <ArrowRightStartOnRectangleIcon className="w-8 h-8" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
          <p className="text-sm text-gray-500 font-medium">{message}</p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-colors ${btnClass}`}
          >
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;