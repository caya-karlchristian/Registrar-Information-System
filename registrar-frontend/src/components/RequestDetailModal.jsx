import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { getDocumentTypes } from "../services/api";
import { PROGRESS_MAP } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useReferenceData } from '../context/ReferenceDataContext';
import ClaimTicket from './ClaimTicket';

const RequestDetailsModal = ({ request, onClose, user }) => {
  const { docTypeName, purposeName, certName } = useReferenceData();
  const [docTypes, setDocTypes] = useState([]);
  const { isDark } = useTheme();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await getDocumentTypes();
        setDocTypes(res.data);
      } catch (err) {
        console.error("Failed to load document types:", err);
      }
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (request) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [request]);

  if (!request) return null; //To identify the role of the user
    const isStudent = request.student_profile != null;
    const isAlumni = request.alumni_profile != null; 
    const progress = PROGRESS_MAP[request.status_id] ?? 0;

  const getDocName = (doc) => {
    // 1. Try the eager-loaded name from the backend relationship
    // 2. Fallback to searching the docTypes state
    // 3. Final fallback to the constant or "Unknown"
    return doc.document_type?.document_name ?? 
          docTypes.find(t => t.document_type_id === doc.document_type_id)?.document_name ?? 
          docTypeName(doc.document_type_id) ?? 
          "Unknown Document";
  };

  const displayStatus = request.status?.status_name || request.status || 'N/A';

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
        onClick={onClose}
      />
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-2xl lg:max-w-4xl max-h-[calc(100vh-32px)] overflow-hidden flex flex-col print:w-full print:max-w-none print:shadow-none print:rounded-none ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>


        {/* Header */}
        <div className={`relative px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0 ${isDark ? 'bg-[#3a3b3c]' : 'bg-pup-maroon'}`}>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Request Details</h3>
            <p className={`text-xs sm:text-sm wrap-break-word ${isDark ? 'text-[#b0b3b8]' : 'text-yellow-200'}`}>
              Transaction ID: {request.uuid ?? `#${request.request_id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close request details"
            className="absolute top-2 right-2 sm:top-3 sm:right-3 text-white hover:text-yellow-200 transition"
          >
            <XCircleIcon className="w-7 h-7" />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-2 lg:space-y-6 print:p-0 print:mb-4 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>
          
          <Section title="Document Request Progress" isDark={isDark}>            
            <div className="w-full">
              <div className={`rounded-full h-2 sm:h-3 overflow-hidden ${isDark ? 'bg-[#3a3b3c]' : 'bg-gray-100'}`}>
                <div
                  className="bg-yellow-500 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
                
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-2">
                <p className={`font-bold text-sm sm:text-md wrap-break-word ${isDark ? 'text-white' : 'text-pup-maroon'}`}>
                    {getProgressLabel(progress)}
                </p>
                <span className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                    {progress}%
                </span>
              </div>
          </div>
          </Section>

          {/* Claim Ticket — QR Code Claiming Policy v1.0 §3.2 access point 2
              (dashboard). Shown for the entire lifetime a request is still
              claimable — Processing (25%), PendingSignature (60%), and
              ReadyToClaim (75%) — matching the pop-up shown immediately on
              submit (RequestForm.jsx/AlumniRequest.jsx) and the inbox
              notification sent at request_submitted: the student can access
              their ticket from day one, not only once it's Ready to Claim.
              Staff can only ever *act* on a scan once the request is
              actually ReadyToClaim — that restriction is enforced
              server-side in the claim endpoint, not by hiding the ticket
              here. Hidden only once there's nothing left to claim:
              Completed (100%) or Forfeited/Cancelled (0%). */}
          {progress !== 0 && progress !== 100 && (
            <Section title="Claim Ticket" isDark={isDark}>
              <div className="flex justify-center w-full py-1 sm:py-2">
                <ClaimTicket uuid={request.uuid} claimCode={request.claim_code} />
              </div>
            </Section>
          )}

          {/* Student Information */}
          {isStudent && (
            <Section title="Student Information" isDark={isDark}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p className="wrap-break-word">
                  <strong>Full Name:</strong>{' '}
                  {request.student_profile
                    ? `${request.student_profile.first_name} ${request.student_profile.middle_name ?? ''} ${request.student_profile.last_name}`.trim()
                    : `${request.alumni_profile?.first_name ?? ''} ${request.alumni_profile?.middle_name ?? ''} ${request.alumni_profile?.last_name ?? ''}`.trim() || 'N/A'}
                </p>
                <p className="wrap-break-word"><strong>Student Number:</strong> {request.academic_record?.student_number ?? request.alumni_academic_record?.student_number ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Date of Birth:</strong> {request.student_profile?.date_of_birth ?? request.alumni_profile?.date_of_birth ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Course:</strong> {request.academic_record?.course ?? request.alumni_academic_record?.course ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Year Level:</strong> {request.academic_record?.year_level ?? 'N/A'}</p>
              </div>
            </Section>
          )}

          {/* Alumni Information*/}
          {isAlumni && (
            <Section title="Alumni Information" isDark={isDark}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p className="wrap-break-word">
                  <strong>Full Name:</strong>{' '}
                  {request?.alumni_profile
                    ? `${request.alumni_profile.first_name} ${request.alumni_profile.middle_name ?? ''} ${request.alumni_profile.last_name}`
                    : 'N/A'}
                </p>
                <p className="wrap-break-word"><strong>Student Number:</strong> {request.alumni_academic_record?.student_number ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Year of Graduation:</strong> {request.alumni_academic_record?.year_of_graduation ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Course:</strong> {request.alumni_academic_record?.course ?? 'N/A'}</p>
              </div>
            </Section>
          )}


          {/* Request Information */}
          <Section title="Request Information" isDark={isDark}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <p className="wrap-break-word">
                <strong>Date Requested:</strong>{' '}
                  {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : 'N/A'}
              </p>
              <p className="wrap-break-word"><strong>Status:</strong> {displayStatus}</p>
              <p className="wrap-break-word"><strong>Purpose:</strong> {request.request_purpose?.purpose_name ?? purposeName(request.request_purpose_id) ?? 'N/A'}</p>
            </div>
          </Section>

          {/* Documents Requested */}
          <Section title="Documents Requested" isDark={isDark}>
            <ul className="list-disc ml-4 sm:ml-5 space-y-2">
              {request.documents
                ?.filter((doc) => !getDocName(doc).toLowerCase().includes('certif'))
                .map((doc, index) => (
                  <li key={doc.request_document_id ?? index} className="wrap-break-word">
                    <strong className="block sm:inline">{getDocName(doc)}</strong>
                    <span className={`inline-flex mt-1 sm:mt-0 sm:ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-200'}`}>
                      {doc.number_of_copies || 1} {doc.number_of_copies > 1 ? 'Copies' : 'Copy'}
                    </span>
                  </li>
                ))}
              {request.certificates?.map((c, i) => (
                <li key={`cert-${i}`} className="wrap-break-word">
                  <strong className="block sm:inline">CERTIFICATION: </strong>
                  {c.certification_type?.certificate_name ?? 'Unknown'}
                  <span className={`inline-flex mt-1 sm:mt-0 sm:ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-200'}`}>
                    {c.number_of_copies || 1} {(c.number_of_copies || 1) > 1 ? 'Copies' : 'Copy'}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Payment Details */}
          <Section title="Payment Details" isDark={isDark}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <p className="wrap-break-word">
                <strong>OR Number:</strong>{' '}
                {request.or_number ?? 'N/A'}
              </p>

              <p className="wrap-break-word">
                <strong>Date of Payment:</strong>{' '}
                {request.receipt_date
                  ? new Date(request.receipt_date).toLocaleDateString()
                  : 'N/A'}
              </p>

            </div>
          </Section>

        </div>
      </div>
    </div>
  , document.body);
};

const getProgressLabel = (progress) => {
  switch (progress) {
    case 0:   return "Request was forfeited";
    case 25:  return "Request received and under review";
    case 60:  return "Registrar processing complete — awaiting signature";
    case 75:  return "Document is ready to claim";
    case 100: return "Document Claimed";
    default:  return "Pending";
  }
};

const Section = ({ title, children, isDark }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-[#3e4042]' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex justify-between items-center px-3 sm:px-4 py-3 font-bold text-sm ${isDark ? 'bg-[#3a3b3c] text-white' : 'bg-yellow-50 text-pup-maroon'}`}
      >
        {title}
        <ChevronDownIcon
          className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && <div className={`p-3 sm:p-4 text-sm ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>{children}</div>}
    </div>
  );
};

export default RequestDetailsModal;