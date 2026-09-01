import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, XCircleIcon, ArrowRightIcon, PrinterIcon } from '@heroicons/react/24/solid';
import { getDocumentTypes, getDocumentRequest, updateRequestDocumentStatus, updateRequestCertificateStatus } from "../services/api";
import { PROGRESS_MAP } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { useReferenceData } from '../context/ReferenceDataContext';
import { hasModuleAction } from '../utils/policy';
import ClaimTicket from './ClaimTicket';

/**
 * Item-level "next action" for a single request_document/request_certificate
 * row — mirrors RequestStatusEnum::allowedTransitions() on the backend, but
 * only surfaces the single sensible forward action per stage (same
 * convention the whole-request buttons in StaffDashboard.jsx already use)
 * rather than a generic transition picker. The backend is still the
 * authority: it validates the transition independently and this list only
 * decides what a button is offered for, same as every other status button
 * in this app.
 *
 * requiredAction mirrors RequestItemStatusService::authorizeItemStatusChange()
 * — 'Complete' only for the move into Completed, 'Process' for everything
 * else — so a button is hidden here exactly when the backend would reject
 * it for lack of permission.
 */
const ITEM_NEXT_ACTIONS = {
  12: [{ label: 'Confirm Received',      target: 1, requiredAction: 'Process'  }], // AwaitingSubmission -> Processing
  1:  [
    { label: 'Send for Signature',       target: 6, requiredAction: 'Process'  }, // Processing -> PendingSignature
    { label: 'Mark Ready to Claim',      target: 2, requiredAction: 'Process'  }, // Processing -> ReadyToClaim
  ],
  6:  [{ label: 'Mark Ready to Claim',    target: 2, requiredAction: 'Process'  }], // PendingSignature -> ReadyToClaim
  2:  [{ label: 'Mark Completed',         target: 3, requiredAction: 'Complete' }], // ReadyToClaim -> Completed
};

const RequestDetailsModal = ({ request, onClose, user, onGenerateCert }) => {
  const { docTypeName, purposeName, certName, statusConfig } = useReferenceData();
  const [docTypes, setDocTypes] = useState([]);
  const [liveRequest, setLiveRequest] = useState(request);
  const [updatingItemKey, setUpdatingItemKey] = useState(null);
  const [itemError, setItemError] = useState(null);
  const { isDark } = useTheme();

  const canProcess  = hasModuleAction(user, 'dashboard', 'Process');
  const canComplete = hasModuleAction(user, 'dashboard', 'Complete');

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

  // Reset the local "live" copy whenever a different request is opened
  // (or the modal is closed), so per-item status edits don't leak
  // between requests and a freshly-opened request always starts from
  // the parent-provided data.
  useEffect(() => {
    setLiveRequest(request);
    setItemError(null);
  }, [request]);

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
  const activeRequest = liveRequest ?? request?.rawRequest ?? request;
  const isStudent = activeRequest.student_profile != null || request?.userType === 'Student';
  const isAlumni = activeRequest.alumni_profile != null || request?.userType === 'Alumni'; 
  const progress = PROGRESS_MAP[activeRequest.status_id ?? request?.statusId] ?? 0;
  const requestDocs = activeRequest.documents ?? activeRequest.rawRequest?.documents ?? request?.documents ?? request?.rawRequest?.documents ?? [];
  const requestCerts = activeRequest.certificates ?? activeRequest.rawRequest?.certificates ?? request?.certificates ?? request?.rawRequest?.certificates ?? [];

  // Re-fetches the whole request after a single item's status changes,
  // so the progress bar / aggregate status / other items all reflect
  // whatever RequestItemStatusService::recomputeAggregateStatus() landed
  // on server-side, rather than trying to predict the aggregate
  // client-side.
  const refreshRequest = async () => {
    try {
      const res = await getDocumentRequest(activeRequest.request_id);
      setLiveRequest(res.data);
    } catch (err) {
      console.error("Failed to refresh request after item update:", err);
    }
  };

  const advanceDocumentItem = async (item, targetStatusId) => {
    const key = `doc-${item.request_document_id}`;
    setUpdatingItemKey(key);
    setItemError(null);
    try {
      await updateRequestDocumentStatus(activeRequest.request_id, item.request_document_id, targetStatusId);
      await refreshRequest();
    } catch (err) {
      setItemError(err.response?.data?.message ?? 'Failed to update this item\'s status.');
    } finally {
      setUpdatingItemKey(null);
    }
  };

  const advanceCertificateItem = async (item, targetStatusId) => {
    const key = `cert-${item.request_certificate_id}`;
    setUpdatingItemKey(key);
    setItemError(null);
    try {
      await updateRequestCertificateStatus(activeRequest.request_id, item.request_certificate_id, targetStatusId);
      await refreshRequest();
    } catch (err) {
      setItemError(err.response?.data?.message ?? 'Failed to update this item\'s status.');
    } finally {
      setUpdatingItemKey(null);
    }
  };

  const getDocName = (doc) => {
    // 1. Try the eager-loaded name from the backend relationship
    // 2. Fallback to searching the docTypes state
    // 3. Final fallback to the constant or "Unknown"
    return doc.document_type?.document_name ?? 
          docTypes.find(t => t.document_type_id === doc.document_type_id)?.document_name ?? 
          docTypeName(doc.document_type_id) ?? 
          "Unknown Document";
  };

  const displayStatus = activeRequest.status?.status_name || activeRequest.status || 'N/A';
  const releaseGroups = activeRequest.release_groups ?? [];
  const hasReleaseGroups = releaseGroups.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
        onClick={onClose}
      />
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-2xl lg:max-w-4xl max-h-[calc(100vh-64px)] overflow-hidden flex flex-col print:w-full print:max-w-none print:shadow-none print:rounded-none ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>


        {/* Header */}
        <div className={`relative px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0 ${isDark ? 'bg-[#3a3b3c]' : 'bg-pup-maroon'}`}>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Request Details</h3>
            <p className={`text-xs sm:text-sm wrap-break-word ${isDark ? 'text-[#b0b3b8]' : 'text-yellow-200'}`}>
              Transaction ID: {activeRequest.uuid ?? `#${activeRequest.request_id}`}
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

          {/* Claim Ticket(s) — QR Code Claiming Policy v1.0 §3.2 access point 2
              (dashboard). Shown for the entire lifetime a request is still
              claimable — AwaitingSubmission (10%), Processing (25%),
              PendingSignature (60%), and ReadyToClaim (75%) — matching the
              pop-up shown immediately on submit (RequestForm.jsx/
              AlumniRequest.jsx) and the inbox notification sent at
              request_submitted: the student can access their ticket from
              day one, not only once it's Ready to Claim.
              Staff can only ever *act* on a scan once the request/group is
              actually ReadyToClaim — that restriction is enforced
              server-side in the claim endpoint, not by hiding the ticket
              here. Hidden only once there's nothing left to claim:
              Completed (100%) or Forfeited/Cancelled (0%).

              Phase 3 (fulfillment_track grouping): a request whose items
              span more than one track gets its OWN ticket per track (see
              DocumentRequest::releaseGroups() / RequestReleaseGroupService)
              — each is scanned/claimed independently. The overwhelming
              majority of requests have zero release groups and fall
              through to the single request-level ticket exactly as
              before. */}
          {progress !== 0 && progress !== 100 && (
            <Section title={hasReleaseGroups ? 'Claim Tickets' : 'Claim Ticket'} isDark={isDark}>
              {hasReleaseGroups ? (
                <div className="flex flex-col gap-4 w-full">
                  {releaseGroups.map((group) => {
                    const groupStatus = statusConfig(group.status_id);
                    const trackLabel = group.fulfillment_track?.name ?? 'Standard';
                    return (
                      <div key={group.request_release_group_id} className={`rounded-lg border p-3 ${isDark ? 'border-[#3e4042]' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wide">{trackLabel}</span>
                          <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${groupStatus.classes}`}>
                            {groupStatus.label}
                          </span>
                        </div>
                        <div className="flex justify-center w-full py-1">
                          <ClaimTicket uuid={group.uuid} claimCode={group.claim_code} small />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex justify-center w-full py-1 sm:py-2">
                  <ClaimTicket uuid={activeRequest.uuid} claimCode={activeRequest.claim_code} />
                </div>
              )}
            </Section>
          )}

          {/* Student Information */}
          {isStudent && (
            <Section title="Student Information" isDark={isDark}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p className="wrap-break-word">
                  <strong>Full Name:</strong>{' '}
                  {activeRequest.student_profile
                    ? `${activeRequest.student_profile.first_name} ${activeRequest.student_profile.middle_name ?? ''} ${activeRequest.student_profile.last_name}`.trim()
                    : `${activeRequest.alumni_profile?.first_name ?? ''} ${activeRequest.alumni_profile?.middle_name ?? ''} ${activeRequest.alumni_profile?.last_name ?? ''}`.trim() || 'N/A'}
                </p>
                <p className="wrap-break-word"><strong>Student Number:</strong> {activeRequest.academic_record?.student_number ?? activeRequest.alumni_academic_record?.student_number ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Date of Birth:</strong> {activeRequest.student_profile?.date_of_birth ?? activeRequest.alumni_profile?.date_of_birth ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Course:</strong> {activeRequest.academic_record?.course ?? activeRequest.alumni_academic_record?.course ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Year Level:</strong> {activeRequest.academic_record?.year_level ?? 'N/A'}</p>
              </div>
            </Section>
          )}

          {/* Alumni Information*/}
          {isAlumni && (
            <Section title="Alumni Information" isDark={isDark}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p className="wrap-break-word">
                  <strong>Full Name:</strong>{' '}
                  {activeRequest?.alumni_profile
                    ? `${activeRequest.alumni_profile.first_name} ${activeRequest.alumni_profile.middle_name ?? ''} ${activeRequest.alumni_profile.last_name}`
                    : 'N/A'}
                </p>
                <p className="wrap-break-word"><strong>Student Number:</strong> {activeRequest.alumni_academic_record?.student_number ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Year of Graduation:</strong> {activeRequest.alumni_academic_record?.year_of_graduation ?? 'N/A'}</p>
                <p className="wrap-break-word"><strong>Course:</strong> {activeRequest.alumni_academic_record?.course ?? 'N/A'}</p>
              </div>
            </Section>
          )}


          {/* Request Information */}
          <Section title="Request Information" isDark={isDark}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <p className="wrap-break-word">
                <strong>Date Requested:</strong>{' '}
                  {activeRequest.requested_at ? new Date(activeRequest.requested_at).toLocaleDateString() : 'N/A'}
              </p>
              <p className="wrap-break-word"><strong>Status:</strong> {displayStatus}</p>
              <p className="wrap-break-word"><strong>Purpose:</strong> {activeRequest.request_purpose?.purpose_name ?? purposeName(activeRequest.request_purpose_id) ?? 'N/A'}</p>
            </div>
          </Section>

          {/* Documents Requested */}
          <Section title="Documents Requested" isDark={isDark}>
            <ul className="list-disc ml-4 sm:ml-5 space-y-2">
              {requestDocs.map((doc, index) => (
                <li key={doc.request_document_id ?? index} className="wrap-break-word">
                  <strong className="block sm:inline">{getDocName(doc)}</strong>
                  <span className={`inline-flex mt-1 sm:mt-0 sm:ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-200'}`}>
                    {doc.number_of_copies || 1} {(doc.number_of_copies || 1) > 1 ? 'Copies' : 'Copy'}
                  </span>
                </li>
              ))}
              {requestCerts.map((c, i) => {
                const cName = c.certification_type?.certificate_name ?? certName(c.certificate_type_id) ?? 'Unknown Certification';
                return (
                  <li key={c.request_certificate_id ?? `cert-${i}`} className="wrap-break-word">
                    <strong className="block sm:inline">CERTIFICATION: </strong>
                    {cName}
                    <span className={`inline-flex mt-1 sm:mt-0 sm:ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-200'}`}>
                      {c.number_of_copies || 1} {(c.number_of_copies || 1) > 1 ? 'Copies' : 'Copy'}
                    </span>
                  </li>
                );
              })}
              {requestDocs.length === 0 && requestCerts.length === 0 && (request?.documentDetailsArray ?? activeRequest.documentDetailsArray)?.map((detail, index) => (
                <li key={`detail-${index}`} className="wrap-break-word">
                  <strong className="block sm:inline">{detail}</strong>
                </li>
              ))}
            </ul>
          </Section>

          {/* Payment Details */}
          <Section title="Payment Details" isDark={isDark}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <p className="wrap-break-word">
                <strong>OR Number:</strong>{' '}
                {activeRequest.or_number ?? 'N/A'}
              </p>

              <p className="wrap-break-word">
                <strong>Date of Payment:</strong>{' '}
                {activeRequest.receipt_date
                  ? new Date(activeRequest.receipt_date).toLocaleDateString()
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
    case 10:  return "Awaiting submission of source document";
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