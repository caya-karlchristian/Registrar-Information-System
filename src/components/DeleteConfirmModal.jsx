import React from 'react';

const DeleteConfirmModal = ({
  open,
  count,
  loading,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">

        <h2 className="text-lg font-bold text-gray-800">
          Delete Confirmation
        </h2>

        <p className="mt-2 text-sm text-gray-600">
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
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
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
