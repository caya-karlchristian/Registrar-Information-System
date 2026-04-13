import React, { useState, useEffect } from 'react';
import { XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl lg:max-w-4xl flex flex-col max-h-[80vh] overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none mt-25 ml-65">

        {/* Header */}
        <div className="bg-pup-maroon px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Request Details</h3>
            <p className="text-sm text-yellow-200">
              Transaction ID: {request.request_id}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 lg:space-y6 lg:p-6 print:p-0 print:mb-4">
          
          <Section title="Document Request Progress">            
            <div className="w-full">
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
                
              <div className="flex justify-between items-center mt-2">
                <p className="font-bold text-pup-maroon text-md">
                    {getProgressLabel(progress)}
                </p>
                <span className="text-sm font-semibold text-gray-500">
                    {progress}%
                </span>
              </div>
          </div>
          </Section>
          {/* Student Information */}
          {isStudent && (
            <Section title="Student Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <p>
                  <strong>Full Name:</strong>{' '}
                  {request.student_profile
                    ? `${request.student_profile.first_name} ${request.student_profile.middle_name ?? ''} ${request.student_profile.last_name}`.trim()
                    : `${request.alumni_profile?.first_name ?? ''} ${request.alumni_profile?.middle_name ?? ''} ${request.alumni_profile?.last_name ?? ''}`.trim() || 'N/A'}
                </p>
                <p><strong>Student Number:</strong> {request.academic_record?.student_number ?? request.alumni_academic_record?.student_number ?? 'N/A'}</p>
                <p><strong>Date of Birth:</strong> {request.student_profile?.date_of_birth ?? request.alumni_profile?.date_of_birth ?? 'N/A'}</p>
                <p><strong>Course:</strong> {request.academic_record?.course ?? request.alumni_academic_record?.course ?? 'N/A'}</p>
                <p><strong>Year Level:</strong> {request.academic_record?.year_level ?? 'N/A'}</p>
              </div>
            </Section>
          )}

          {/* Alumni Information*/}
          {isAlumni && (
            <Section title="Alumni Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <p>
                  <strong>Full Name:</strong>{' '}
                  {user?.alumni_profile
                    ? `${user.alumni_profile.first_name} ${user.alumni_profile.middle_name ?? ''} ${user.alumni_profile.last_name}`
                    : 'N/A'}
                </p>
                <p><strong>Email:</strong> {user?.email ?? 'N/A'}</p>
              </div>
            </Section>
          )}

          {/* Academic Records - only for students //NEED FETCHING IN BACKEND IN MODAL FK TO STUDENT ACAD ID
          {isStudent && (
            <Section title="Academic Records">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p><strong>Student Number:</strong> {request.academic_record?.student_number ?? 'N/A'}</p>
                <p><strong>Course:</strong> {request.academic_record?.course ?? 'N/A'}</p>
                <p><strong>Year Level:</strong> {request.academic_record?.year_level ?? 'N/A'}</p>
                <p><strong>Section:</strong> {request.academic_record?.section ?? 'N/A'}</p>
              </div>
            </Section>
          )} */}

          {/* Request Information */}
          <Section title="Request Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p>
                <strong>Date Requested:</strong>{' '}
                  {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : 'N/A'}
              </p>
              <p><strong>Status:</strong> {displayStatus}</p>
              <p><strong>Purpose:</strong> {request.request_purpose?.purpose_name ?? PURPOSE_MAP[request.request_purpose_id] ?? 'N/A'}</p>
              {request.certificates?.length > 0 && (
                <div>
                  <strong>Certification Types:</strong>
                  <ul className="list-disc ml-5 mt-1">
                    {request.certificates.map((c, i) => (
                      <li key={i}>{c.certification_type?.certificate_name ?? 'Unknown'}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          {/* Documents Requested */}
          <Section title="Documents Requested">
            <ul className="list-disc ml-5 space-y-1">
              {request.documents?.map(doc => (
                <li key={doc.request_document_id}>
                  {getDocName(doc)}
                  <span className="ml-2 bg-yellow-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                     {doc.number_of_copies || 1} {doc.number_of_copies > 1 ? 'Copies' : 'Copy'}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Payment Details */}
          <Section title="Payment Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <p>
                <strong>OR Number:</strong>{' '}
                {request.or_number ?? 'N/A'}
              </p>

              <p>
                <strong>Date of Payment:</strong>{' '}
                {request.receipt_date
                  ? new Date(request.receipt_date).toLocaleDateString()
                  : 'N/A'}
              </p>

            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3 shrink-0">
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

export default RequestDetailsModal;
