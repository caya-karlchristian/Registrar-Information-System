import React, { useState } from 'react';
import { XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

const documentTypeMap = {
      1: "Certificate of Good Moral Character",
      2: "Certification, Authentication, Verification (CAV) / APOSTILE",
      3: "Authentication/Certified True Copy - Local",
      4: "Informative Copy of Grades",
      5: "CAV - CHED",
      6: "CAV - WES/CES",
      7: "Cross-enrollment Fee",
      8: "Re-admission Fee",
      9: "Admission Fee for Transfer Students (From Private School)",
      10: "Admission Fee for Transfer Students (From SUCs)",
      11: "New Copy of Registration Card (With Affidavit of Loss)",
      12: "Diploma",
      13: "Accreditation Fee",
      14: "Completion Fee",
      15: "Transcript of Records",
      16: "Correction in Student Information System",
    };

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden lg:max-w-3xl print:w-full print:max-w-none print:shadow-none print:rounded-none">

        {/* Header */}
        <div className="bg-pup-maroon px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Request Details</h3>
            <p className="text-sm text-yellow-200">
              Transaction ID: {request.request_id}
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
        <div className="p-4 space-y-2 lg:space-y6 lg:p-6 print:p-0 print:mb-4">

          {/* Student Information */}
          <Section title="Student Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p>
                <strong>Full Name:</strong>{' '}
                {request.student_profile
                  ? `${request.student_profile.first_name} ${
                      request.student_profile.middle_name ?? ''
                    } ${request.student_profile.last_name}`
                  : 'N/A'}
              </p>

              <p><strong>Student Number:</strong> {request.academic_record?.student_number ?? 'N/A'}</p>
              <p><strong>Date of Birth:</strong> {request.student_profile?.date_of_birth ?? 'N/A'}</p>
              <p><strong>Contact Number:</strong> {request.student_profile?.contact_number ?? 'N/A'}</p>
              <p className="md:col-span-2">
                <strong>Address:</strong> {request.student_profile?.permanent_address ?? 'N/A'}
              </p>

            </div>
          </Section>

          {/* Academic Records */}
          <Section title="Academic Records">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p><strong>Course:</strong> {request.academic_record?.course ?? 'N/A'}</p>
              <p><strong>Year Level:</strong> {request.academic_record?.year_level ?? 'N/A'}</p>
              <p><strong>Student Number:</strong> {request.academic_record?.student_number ?? 'N/A'}</p>
            </div>
          </Section>

          {/* Request Information */}
          <Section title="Request Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p>
                <strong>Date Requested:</strong>{' '}
                {request.requested_at
                  ? new Date(request.requested_at).toLocaleDateString()
                  : 'N/A'}
              </p>
              <p><strong>Status:</strong> {request.status?.status_name ?? 'N/A'}</p>
              <p><strong>Purpose:</strong> {request.purpose_of_request}</p>
              {request.certification && (
                <p><strong>Certification Type:</strong> {request.certification}</p>
              )}
            </div>
          </Section>

          {/* Documents Requested */}
          <Section title="Documents Requested">
            <ul className="list-disc ml-5 space-y-1">
              {request.documents?.map(doc => (
                <li key={doc.request_document_id}>
                  {documentTypeMap[doc.document_type_id] ?? 'Unknown Document'}
                </li>
              ))}
            </ul>
          </Section>

          {/* Payment Details */}
          <Section title="Payment Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p>
                <strong>Receipt Number:</strong>{' '}
                {request.receipt_number ?? 'N/A'}
              </p>

              <p>
                <strong>Date of Payment:</strong>{' '}
                {request.receipt_date
                  ? new Date(request.receipt_date).toLocaleDateString()
                  : 'N/A'}
              </p>

              <p><strong>Number of Copies:</strong> {request.number_of_copies ?? 'N/A'}</p>
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
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
