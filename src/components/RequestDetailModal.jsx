// src/components/RequestDetailsModal.js
import React, { useState } from 'react';
import { XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

const Section = ({ title, children }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-4 py-3 bg-yellow-50 text-pup-maroon font-bold text-sm"
      >
        {title}
        <ChevronDownIcon
          className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && <div className="p-4 bg-white text-sm">{children}</div>}
    </div>
  );
};

const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">

        {/* Header */}
        <div className="bg-pup-maroon px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Request Details</h3>
            <p className="text-sm text-yellow-200">
              Transaction ID: #{request.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Student Information */}
          <Section title="Student Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p><strong>Full Name:</strong> {request.studentName}</p>
              <p><strong>Student Number:</strong> {request.studentNumber}</p>
              <p><strong>Date of Birth:</strong> {request.dob}</p>
              <p><strong>Contact Number:</strong> {request.contactNumber}</p>
              <p className="md:col-span-2">
                <strong>Address:</strong> {request.address}
              </p>
            </div>
          </Section>

          {/* Academic Records */}
          <Section title="Academic Records">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p><strong>Course:</strong> {request.course}</p>
              <p><strong>Year Level:</strong> {request.yearLevel}</p>
              <p><strong>Year Admitted:</strong> {request.yearAdmitted}</p>
              <p><strong>Last S.Y. Attended:</strong> {request.lastSYAttended}</p>
            </div>
          </Section>

          {/* Request Information */}
          <Section title="Request Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p><strong>Date Requested:</strong> {request.date}</p>
              <p><strong>Status:</strong> {request.statusName}</p>
              <p><strong>Purpose:</strong> {request.purpose}</p>
              {request.certification && (
                <p><strong>Certification Type:</strong> {request.certification}</p>
              )}
            </div>
          </Section>

          {/* Documents Requested */}
          <Section title="Documents Requested">
            <ul className="list-disc ml-5 space-y-1">
              {request.documents?.map((doc, i) => (
                <li key={i}>{doc}</li>
              ))}
            </ul>
          </Section>

          {/* Payment Details */}
          <Section title="Payment Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p><strong>Receipt Number:</strong> {request.receiptNumber}</p>
              <p><strong>Date of Payment:</strong> {request.paymentDate}</p>
              <p><strong>Number of Copies:</strong> {request.copies}</p>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            Close
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-semibold text-white bg-pup-maroon hover:bg-[#660000] rounded-lg"
          >
            Print Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
