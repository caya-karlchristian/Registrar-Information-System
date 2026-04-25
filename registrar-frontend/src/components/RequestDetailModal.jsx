import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { getDocumentTypes } from "../services/api";
import { DOC_TYPE_MAP, PURPOSE_MAP, PROGRESS_MAP} from '../utils/constants';

const RequestDetailsModal = ({ request, onClose, user }) => {
  const [docTypes, setDocTypes] = useState([]);

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
    const isStudent = request.student_profile !== null && request.student_profile !== undefined;
    const isAlumni = user?.role_id === 2;
    const progress = PROGRESS_MAP[request.status_id] ?? 0;

  const getDocName = (doc) => {
    // 1. Try the eager-loaded name from the backend relationship
    // 2. Fallback to searching the docTypes state
    // 3. Final fallback to the constant or "Unknown"
    return doc.document_type?.document_name ?? 
          docTypes.find(t => t.document_type_id === doc.document_type_id)?.document_name ?? 
          DOC_TYPE_MAP[doc.document_type_id] ?? 
          "Unknown Document";
  };

  const displayStatus = request.status?.status_name || request.status || 'N/A';

  return (
    <div className="fixed inset-x-0 top-25 pt-10 md:pt-10 bottom-0 pb-5 z-50 flex items-start justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-hidden lg:top-24 lg:left-72 lg:w-[calc(100vw-18rem)] lg:bottom-0 lg:items-start lg:justify-center">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-[95vw] sm:w-full sm:max-w-2xl lg:max-w-4xl flex flex-col h-full sm:h-auto max-h-full sm:max-h-[calc(100vh-110px)] lg:max-h-[calc(100vh-145px)] overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none mx-auto my-0 sm:my-4 lg:my-4">

        {/* Header */}
        <div className="relative bg-pup-maroon px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Request Details</h3>
            <p className="text-xs sm:text-sm text-yellow-200 wrap-break-word">
              Transaction ID: {request.request_id}
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-2 lg:space-y-6 print:p-0 print:mb-4">
          
          <Section title="Document Request Progress">            
            <div className="w-full">
              <div className="bg-gray-100 rounded-full h-2 sm:h-3 overflow-hidden">
                <div
                  className="bg-yellow-500 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
                
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-2">
                <p className="font-bold text-pup-maroon text-sm sm:text-md wrap-break-word">
                    {getProgressLabel(progress)}
                </p>
                <span className="text-xs sm:text-sm font-semibold text-gray-500">
                    {progress}%
                </span>
              </div>
          </div>
          </Section>
          {/* Student Information */}
          {isStudent && (
            <Section title="Student Information">
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
            <Section title="Alumni Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p className="wrap-break-word">
                  <strong>Full Name:</strong>{' '}
                  {user?.alumni_profile
                    ? `${user.alumni_profile.first_name} ${user.alumni_profile.middle_name ?? ''} ${user.alumni_profile.last_name}`
                    : 'N/A'}
                </p>
                <p className="wrap-break-word"><strong>Email:</strong> {user?.email ?? 'N/A'}</p>
              </div>
            </Section>
          )}


          {/* Request Information */}
          <Section title="Request Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <p className="wrap-break-word">
                <strong>Date Requested:</strong>{' '}
                  {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : 'N/A'}
              </p>
              <p className="wrap-break-word"><strong>Status:</strong> {displayStatus}</p>
              <p className="wrap-break-word"><strong>Purpose:</strong> {request.request_purpose?.purpose_name ?? PURPOSE_MAP[request.request_purpose_id] ?? 'N/A'}</p>
            </div>
          </Section>

          {/* Documents Requested */}
          <Section title="Documents Requested">
            <ul className="list-disc ml-4 sm:ml-5 space-y-2">
              {request.documents
                ?.filter((doc) => !getDocName(doc).toLowerCase().includes('certif'))
                .map((doc) => (
                  <li key={doc.request_document_id} className="wrap-break-word">
                    <strong className="block sm:inline">{getDocName(doc)}</strong>
                    <span className="inline-flex mt-1 sm:mt-0 sm:ml-2 bg-yellow-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {doc.number_of_copies || 1} {doc.number_of_copies > 1 ? 'Copies' : 'Copy'}
                    </span>
                  </li>
                ))}
              {request.certificates?.map((c, i) => (
                <li key={`cert-${i}`} className="wrap-break-word">
                  <strong className="block sm:inline">CERTIFICATION: </strong>
                  {c.certification_type?.certificate_name ?? 'Unknown'}
                  <span className="inline-flex mt-1 sm:mt-0 sm:ml-2 bg-yellow-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {c.number_of_copies || 1} {(c.number_of_copies || 1) > 1 ? 'Copies' : 'Copy'}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Payment Details */}
          <Section title="Payment Details">
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
  );
};

const getProgressLabel = (progress) => {
  switch (progress) {
    case 0:   return "Request was forfeited";
    case 25:  return "Request received and under review";
    case 75:  return "Preparing your document for pickup";
    case 100: return "Document is ready to claim";
    default:  return "Pending";
  }
};

const Section = ({ title, children }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden ">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-3 sm:px-4 py-3 bg-yellow-50 text-pup-maroon font-bold text-sm"
      >
        {title}
        <ChevronDownIcon
          className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && <div className="p-3 sm:p-4 bg-white text-sm">{children}</div>}
    </div>
  );
};

export default RequestDetailsModal;
