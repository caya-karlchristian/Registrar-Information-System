import React from 'react';
import { useTheme } from '../context/ThemeContext';

const DeleteConfirmModal = ({
  open,
  count,
  loading,
  onCancel,
  onConfirm,
}) => {
  const { isDark } = useTheme();
  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-black/70' : 'bg-black/40'}`}>
      <div className={`rounded-xl shadow-xl w-full max-w-md p-6 ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>

        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Delete Confirmation
        </h2>

        <p className={`mt-2 text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
          Are you sure you want to permanently delete{" "}
          <span className="font-bold text-red-600">
            {count}
          </span>{" "}
          selected request{count > 1 && "s"}?
          This action cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className={`px-4 py-2 rounded-lg border ${isDark ? 'border-[#3e4042] text-[#e4e6eb] hover:bg-[#2a2a2f]' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeleteConfirmModal;
