import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/solid';
import {
  getDocumentRequests,
  getRequestStatuses,
  updateDocumentRequest,
  deleteDocumentRequest,
} from '../services/api';
import RequestDetailsModal from '../components/RequestDetailModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay.jsx';
import LineLoading from '../components/LineLoading.jsx';
import CertificateModal from '../components/CertificateModal.jsx';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';
import { useNotificationsContext } from '../context/NotificationsContext';
import DropdownGroup from '../components/DropDown.jsx';

import { useReferenceData } from '../context/ReferenceDataContext';
import { useTheme } from '../context/ThemeContext';
const STATUS_FALLBACK = {
  PENDING: 1,
  READY: 2,
  COMPLETED: 3,
  FORFEITED: 4,  // matches RequestStatusEnum::Forfeited = 4 on the backend
};

const ITEMS_PER_PAGE = 5;
const PRINTED_CERTIFICATE_STORAGE_KEY = 'printed-certificate-request-ids';

// Completed requests stay visible on the default dashboard for 1 day.
// After that they only appear when the user explicitly filters/searches.
const COMPLETED_VISIBILITY_MS = 24 * 60 * 60 * 1000;

/**
 * Default dashboard visibility rules:
 *  - Pending / Processing / Ready to Claim → always shown
 *  - Completed → shown only within 1 day of the request date
 *  - Everything else (Forfeited, Cancelled, ...) → hidden unless filtered/searched
 */
const isDefaultVisible = (req, resolvedIds) => {
  const { statusId, statusName, timestamp } = req;
  const name = String(statusName ?? '').trim().toLowerCase();
  if (statusId === resolvedIds.PENDING || name === 'pending')         return true;
  if (name === 'processing')                                           return true;
  if (statusId === resolvedIds.READY || name === 'ready to claim')    return true;
  if (statusId === resolvedIds.COMPLETED || name === 'completed') {
    return timestamp > 0 && (Date.now() - timestamp) <= COMPLETED_VISIBILITY_MS;
  }
  return false;
};

// Module-level constant — stable across renders, safe in useEffect deps.
const DASHBOARD_REFETCH_TRIGGERS = new Set([
  'admin_new_request',
  'admin_payment_verification',
  'admin_incomplete_request',
  'status_updated',
  'request_processing',
  'ready_to_claim',
  'request_completed',
  'request_forfeited',
]);

const StaffDashboard = () => {
  const { docTypeName, purposeName, certName } = useReferenceData();
  const { isDark } = useTheme();
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('Recent Requests');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [certRequest, setCertRequest] = useState(null);
  const [requestStatuses, setRequestStatuses] = useState([]);

  const [printedCertificateIds, setPrintedCertificateIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(PRINTED_CERTIFICATE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const { notifications } = useNotificationsContext();

  const statusIds = useCallback(() => {
    const lowerNameToId = Object.fromEntries(
      requestStatuses
        .filter(s => s?.status_name && s?.status_id)
        .map(s => [s.status_name.toLowerCase(), Number(s.status_id)])
    );

    return {
      PENDING: lowerNameToId.pending ?? STATUS_FALLBACK.PENDING,
      READY: lowerNameToId['ready to claim'] ?? STATUS_FALLBACK.READY,
      COMPLETED: lowerNameToId.completed ?? STATUS_FALLBACK.COMPLETED,
      FORFEITED: lowerNameToId.forfeited ?? STATUS_FALLBACK.FORFEITED,
    };
  }, [requestStatuses]);

  const resolvedStatusIds = statusIds();

  /* ---------------- FETCH DATA ---------------- */
  const fetchData = useCallback(async (showOverlay = true) => {
    try {
      if (showOverlay) setLoading(true);
      const [requestsRes, statusesRes] = await Promise.all([
        getDocumentRequests({ per_page: 200 }),
        getRequestStatuses(),
      ]);

      const statuses = statusesRes.data || [];
      setRequestStatuses(statuses);

      const STATUS = (() => {
        const lowerNameToId = Object.fromEntries(
          statuses
            .filter(s => s?.status_name && s?.status_id)
            .map(s => [s.status_name.toLowerCase(), Number(s.status_id)])
        );

        return {
          PENDING: lowerNameToId.pending ?? STATUS_FALLBACK.PENDING,
          READY: lowerNameToId['ready to claim'] ?? STATUS_FALLBACK.READY,
          COMPLETED: lowerNameToId.completed ?? STATUS_FALLBACK.COMPLETED,
          FORFEITED: lowerNameToId.forfeited ?? STATUS_FALLBACK.FORFEITED,
        };
      })();

      const formatted = (requestsRes.data?.data ?? requestsRes.data ?? []).map(r => {
        const requestDate = r.requested_at ? new Date(r.requested_at) : null;
        const now = new Date();
        const diffDays = requestDate ? (now - requestDate) / (1000 * 60 * 60 * 24) : 0;

        let computedStatusId = r.status?.status_id;
        let computedStatusName = r.status?.status_name;

        const alreadyForfeited = computedStatusId === STATUS.FORFEITED || String(computedStatusName).toLowerCase() === 'forfeited';
        const alreadyCompleted = computedStatusId === STATUS.COMPLETED || String(computedStatusName).toLowerCase() === 'completed';
        if (!alreadyForfeited && !alreadyCompleted && diffDays >= 90) {
          computedStatusId = STATUS.FORFEITED;
          computedStatusName = 'Forfeited';
          updateDocumentRequest(r.request_id, { status_id: STATUS.FORFEITED }).catch(err => {
            console.error(`Failed to forfeit request ${r.request_id}:`, err);
          });
        }

        const finalCertName = r.certificates?.length > 0
          ? r.certificates.map(c => c.certification_type?.certificate_name).filter(Boolean).join(', ')
          : null;

        const isCertificate = Boolean(
          (r.certificates && r.certificates.length > 0) ||
            r.documents?.some(d => {
              const name =
                d.document_type?.document_name?.toLowerCase() ||
                docTypeName(d.document_type_id)?.toLowerCase() ||
                '';

              return name.includes('cert');
            })
        );

        const getDocName = d =>
          d.document_type?.document_name ||
          docTypeName(d.document_type_id) ||
          `Unknown Doc (ID: ${d.document_type_id})`;

        const totalCopies = (r.documents?.reduce((sum, d) => sum + (Number(d.number_of_copies) || 1), 0) || 0) + (r.certificates?.reduce((sum, c) => sum + (Number(c.number_of_copies) || 1), 0) || 0) || 1;

        const documentDetailsArray = (() => {
          const docs = [];
          if (r.certificates?.length > 0) {
            r.certificates.forEach(c => {
              if (c.certification_type?.certificate_name) {
                docs.push(`Certification: ${c.certification_type.certificate_name}`);
              }
            });
          }
          if (r.documents?.length > 0) {
            r.documents.forEach(d => docs.push(getDocName(d)));
          }
          return docs;
        })();

        return {
          id: r.request_id,
          rawRequest: {
            ...r,
            status: {
              ...(r.status || {}),
              status_id: computedStatusId,
              status_name: computedStatusName,
            },
          },
          studentName: r.student_profile
            ? `${r.student_profile.first_name} ${r.student_profile.middle_name ?? ''} ${r.student_profile.last_name}`
            : r.alumni_profile
            ? `${r.alumni_profile.first_name} ${r.alumni_profile.middle_name ?? ''} ${r.alumni_profile.last_name}`
            : 'N/A',
          studentNumber: r.academic_record?.student_number
            ?? r.alumni_academic_record?.student_number
            ?? 'N/A',
          userType: r.student_profile ? 'Student' : 'Alumni',
          certName: finalCertName,
          certificateNames: r.certificates?.map(c => c.certification_type?.certificate_name).filter(Boolean) ?? [],
          isCertificate,
          copies: totalCopies,
          documentDetailsArray,

          // Metadata for Certificate Modal
          course: r.student_profile?.course ?? '',
          major: r.student_profile?.major ?? '',
          educationLevel: r.student_profile?.education_level ?? '',
          syAdmitted: r.academic_record?.sy_admitted ?? '',
          dateGraduated: r.academic_record?.date_graduated ?? '',
          diplomaNum: r.academic_record?.diploma_number ?? '',
          eventTitle: r.event_title ?? '',
          or_number: r.or_number ?? '',

          date: requestDate
            ? requestDate.toLocaleDateString('en-GB', {
                day: '2-digit', month: 'long', year: 'numeric',
              })
            : 'N/A',
          time: requestDate
            ? requestDate.toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
              })
            : '',

          statusId: computedStatusId,
          statusName: computedStatusName,
          timestamp: requestDate ? requestDate.getTime() : 0,
        };
      });

      setRequests(formatted);
    } catch (error) {
      console.error('Error fetching document requests:', error);
    } finally {
      if (showOverlay) setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when a relevant notification arrives via WebSocket.
  // DASHBOARD_REFETCH_TRIGGERS is defined at module scope so it is
  // stable across renders and can safely be omitted from deps.
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (latest && DASHBOARD_REFETCH_TRIGGERS.has(latest.type)) {
      fetchData(false); // silent background refresh, no loading overlay
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications[0]?.id, fetchData]);

  // Polling fallback — keeps the dashboard eventually-consistent even when
  // the WebSocket is down or the queue worker misses an event.
  // 30 s is frequent enough to feel live without hammering the backend.
  useEffect(() => {
    const id = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRINTED_CERTIFICATE_STORAGE_KEY, JSON.stringify(printedCertificateIds));
  }, [printedCertificateIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortOrder]);

  /* ---------------- STATUS UPDATE ---------------- */
  const handleStatusUpdate = async (id, newStatusId) => {
    try {
    setUpdatingId(id);
    setActionLoading(true);
    await updateDocumentRequest(id, { status_id: newStatusId });
    await fetchData(false);
    } catch (error) {
    console.error('Status update failed:', error);
    alert('Error: ' + error.message);
    } finally {
    setActionLoading(false);
    setUpdatingId(null);
    }
  };

  /* ---------------- FILTERED + SORTED DATA ---------------- */
  const statusFilterOptions = [
    'All',
    ...requestStatuses
      .map(s => s?.status_name)
      .filter(Boolean)
      .filter((name, index, self) => self.indexOf(name) === index),
  ];

  // True when the user has explicitly chosen a status filter or typed a search term.
  // In default mode the dashboard only shows actionable/recent work.
  const isFiltering = filterStatus !== 'All' || searchTerm.trim() !== '';

  const filteredData = requests
    .filter(r => {
      // Default view: hide Forfeited, Cancelled, and old Completed records.
      if (!isFiltering && !isDefaultVisible(r, resolvedStatusIds)) return false;

      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Completed' && r.statusId === resolvedStatusIds.COMPLETED) ||
        r.statusName === filterStatus;
      const matchesSearch =
        searchTerm.trim() === '' ||
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toString().includes(searchTerm);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => (sortOrder === 'Old Requests' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp));

  /* ---------------- PAGINATION ---------------- */
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const handleNextPage = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => currentPage > 1 && setCurrentPage(prev => prev - 1);

  /* ---------------- STATUS BADGE ---------------- */
  const getStatusBadge = status => {
    const normalizedStatus = String(status ?? '').trim().toLowerCase();
    const styles = isDark
      ? {
          pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-600',
          processing: 'bg-blue-900/20 text-blue-400 border-blue-600',
          'ready to claim': 'bg-green-900/20 text-green-400 border-green-600',
          completed: 'bg-gray-700/20 text-gray-300 border-gray-400',
          forfeited: 'bg-gray-700/20 text-gray-300 border-gray-400',
          cancelled: 'bg-gray-700/20 text-gray-300 border-gray-400',
        }
      : {
          pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          processing: 'bg-blue-100 text-blue-700 border-blue-200',
          'ready to claim': 'bg-green-100 text-green-700 border-green-200',
          completed: 'bg-gray-100 text-gray-700 border-gray-200',
          forfeited: 'bg-gray-100 text-gray-700 border-gray-200',
          cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
        };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${styles[normalizedStatus] ?? (isDark ? 'bg-gray-700/20 text-gray-300 border-gray-400' : 'bg-gray-100 text-gray-600')}`}>
        {status ?? 'Unknown'}
      </span>
    );
  };

  // ---------------- BULK DELETE HANDLERS ---------------- */
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentItems.map(item => item.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => (
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    ));
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSelected = async () => {
    try {
      setActionLoading(true);
      await Promise.all(selectedIds.map(id => deleteDocumentRequest(id)));
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      await fetchData(false);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToolbarDropdownChange = (e) => {
    const { name, value } = e.target;
    name === 'filterStatus' ? setFilterStatus(value) : setSortOrder(value);
  };

  const markCertificateAsPrinted = (requestId) => {
    if (!requestId) return;
    setPrintedCertificateIds(prev => (prev.includes(requestId) ? prev : [...prev, requestId]));
  };


  return (
    <div className={`relative ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5] text-gray-900'}`}>
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>
        <LoadingOverlay isVisible={loading} message="Fetching Request Records..." />
        <LineLoading isVisible={actionLoading} />

        {/* ---------------- CARDS ---------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard title="New Requests"     count={requests.filter(r => r.statusId === resolvedStatusIds.PENDING).length}    color="yellow" />
          <StatCard title="Processing"       count={requests.filter(r => r.statusName?.toLowerCase() === 'processing').length} color="blue" />
          <StatCard title="Ready for Pickup" count={requests.filter(r => r.statusId === resolvedStatusIds.READY).length}       color="green" />
        </div>

        {/* ---------------- TOOLBAR ---------------- */}
        <div className={`p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-end ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white border border-gray-100'}`}>
          
          {selectedIds.length > 0 ? (
            <div className={`flex flex-wrap items-center gap-3 p-2 rounded-lg border w-full md:w-auto ${isDark ? 'bg-red-900/15 border-red-900/20' : 'bg-red-50 border-red-100'}`}>
              <span className={`font-bold text-sm ml-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>{selectedIds.length} Selected</span>
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                <TrashIcon className="w-4 h-4" /> Delete Selected
              </button>
            </div>
          ) : (
            <div className="w-full md:max-w-md">
              <VoiceSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search"
                language="en-US"
              />
            </div>
          )} 

        <div className="flex flex-col sm:flex-row items-end gap-2 w-full md:w-auto">
          
          {/* 1. The Dropdown Grid (Now comes first) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:min-w-95">
            <DropdownGroup
              label={`Status${!isFiltering ? ' (active only)' : ''}`}
              name="filterStatus"
              value={filterStatus}
              onChange={handleToolbarDropdownChange}
              options={statusFilterOptions}
              labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
            />

            <DropdownGroup
              label="Sort"
              name="sortOrder"
              value={sortOrder}
              onChange={handleToolbarDropdownChange}
              options={['Recent Requests', 'Old Requests']}
              labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFilterStatus('All');
              setSortOrder('Recent Requests');
              setSearchTerm('');
              setSelectedIds([]);
            }}
            className={`w-full sm:w-auto px-4 py-3 rounded-lg text-sm font-semibold transition-colors border shadow-sm h-11.5 flex items-center justify-center shrink-0
              ${isDark
                ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            Clear Filters
          </button>
        </div>
      </div>

        {/* ---------------- TABLE ---------------- */}
        <div className={`rounded-xl shadow overflow-x-auto border ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-100'}`}>
          <table className={`min-w-full divide-y ${isDark ? 'divide-[#3e4042]' : 'divide-gray-100'}`}>
            <thead className={isDark ? 'bg-[#18191a]/80' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'border-[#4e4f50] text-blue-400 focus:ring-blue-400 bg-[#242526]' : 'border-gray-300 text-blue-600 focus:ring-blue-500'}`}
                    onChange={handleSelectAll}
                    checked={currentItems.length > 0 && selectedIds.length === currentItems.length}
                  />
                </th>
                <Th center>Req ID</Th>
                <Th center>Name</Th>
                <Th center>Classification</Th>
                <Th center>Document</Th>
                <Th center>Date & Time</Th>
                <Th center>No. of Copies</Th>
                <Th center>Status</Th>
                <Th center>Actions</Th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-[#3e4042]' : 'divide-y divide-gray-100'}>
              {currentItems.map(req => (
                <tr key={req.id} className={`transition-colors ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-50'} ${selectedIds.includes(req.id) ? (isDark ? 'bg-blue-900/15' : 'bg-blue-50') : ''}`}>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'border-[#4e4f50] bg-[#242526]' : 'border-gray-300'}`}
                      checked={selectedIds.includes(req.id)}
                      onChange={() => handleSelectOne(req.id)}
                    />
                  </td>
                  <Td center>{req.id}</Td>
                  <Td>
                    <div className="font-bold text-center">{req.studentName}</div>
                  </Td>
                  <Td center>
                    <span className="text-xs font-bold tracking-wide">
                      {req.userType.toUpperCase()}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {req.documentDetailsArray[0]}
                      </span>

                      {req.documentDetailsArray.length > 1 && (
                          <span className={isDark ? 'text-xs text-[#b0b3b8]' : 'text-xs text-gray-400'}>
                          +{req.documentDetailsArray.length - 1} more
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td center>
                      <div className={isDark ? 'text-xs text-[#b0b3b8]' : 'text-xs text-gray-400'}>{req.date}</div>
                      <div className={isDark ? 'text-xs text-[#b0b3b8]' : 'text-xs text-gray-400'}>{req.time}</div>
                  </Td>
                    <Td center><span className={isDark ? 'font-semibold text-[#e4e6eb]' : 'font-semibold text-gray-700'}>{req.copies}</span></Td>
                  <Td center>{getStatusBadge(req.statusName)}</Td>
                  <Td center>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2 min-w-0 sm:min-w-37.5">
                      {req.isCertificate && req.statusId === resolvedStatusIds.PENDING && (
                        <button
                          title="Generate Certificate"
                          onClick={() => {
                            setCertRequest(req);
                          }}
                          className={isDark ? 'p-2 text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c] rounded-lg transition' : 'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition'}
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      )}
                      {req.statusId === resolvedStatusIds.PENDING && (
                        <button
                          disabled={updatingId === req.id || (req.isCertificate && !printedCertificateIds.includes(req.id))}
                          onClick={() => {
                            if (req.isCertificate && !printedCertificateIds.includes(req.id)) {
                              alert('Please generate and print the certificate first before marking this request as Ready to claim.');
                              return;
                            }
                            handleStatusUpdate(req.id, resolvedStatusIds.READY);
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 border border-blue-600' : 'bg-blue-500 hover:bg-blue-700'}`}
                          title={
                            req.isCertificate && !printedCertificateIds.includes(req.id)
                              ? 'Print certificate first'
                              : 'Mark as Ready to claim'
                          }
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          {req.isCertificate && !printedCertificateIds.includes(req.id) ? 'Ready' : 'Ready'}
                        </button>
                      )}

                      {req.statusId === resolvedStatusIds.READY && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, resolvedStatusIds.COMPLETED)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 ${isDark ? 'bg-green-900/20 hover:bg-green-900/30 text-green-400 border border-green-600' : 'bg-green-500 hover:bg-green-700'}`}
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Done
                        </button>
                      )}              
                      <button
                        title="View Details"
                        onClick={() => setSelectedRequest(req.rawRequest)}
                        className={isDark ? 'p-2 text-[#b0b3b8] hover:text-[#e4e6eb] hover:bg-[#3a3b3c] rounded-lg transition' : 'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition'}
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>                     
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ---------------- PAGINATION ---------------- */}
          <div className={`sticky left-0 bottom-0 w-full px-4 sm:px-8 py-4 text-[11px] sm:text-sm flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden border-t z-10 ${isDark ? 'bg-[#18191a] text-[#b0b3b8] border-[#3e4042]' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
            <span className="text-center sm:text-left whitespace-nowrap">
              Showing {filteredData.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} results
            </span>

            <div className="flex gap-4 items-center">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-1 rounded transition-colors ${
                  currentPage === 1 ? (isDark ? 'text-[#4e4f50] cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') : (isDark ? 'text-[#b0b3b8] hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-200')
                }`}
              >
                <ChevronLeftIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>

              <span className={`text-xs font-semibold whitespace-nowrap ${isDark ? 'text-[#e4e6eb]' : 'text-gray-700'}`}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-1 rounded transition-colors ${
                  currentPage === totalPages || totalPages === 0 ? (isDark ? 'text-[#4e4f50] cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') : (isDark ? 'text-[#b0b3b8] hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-200')
                }`}
              >
                <ChevronRightIcon className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      <DeleteConfirmModal
        open={showDeleteConfirm}
        count={selectedIds.length}
        loading={loading}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteSelected}
      />

{certRequest && (
        <CertificateModal
          request={certRequest}
          onCertificatePrinted={markCertificateAsPrinted}
          onClose={() => setCertRequest(null)}
        />
      )}
    </div>
  );
};

/* ---------------- REUSABLE COMPONENTS ---------------- */
const StatCard = ({ title, count, color }) => {
  const { isDark } = useTheme();
  const colors = {
    yellow: isDark ? 'border-yellow-400 text-yellow-400' : 'border-yellow-400 text-yellow-500',
    blue: isDark ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500',
    green: isDark ? 'border-green-400 text-green-400' : 'border-green-500 text-green-500',
  };
  return (
    <div className={`p-6 rounded-xl shadow border-l-4 ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white'} ${colors[color]}`}>
      <div className={`text-xs uppercase font-bold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}>{title}</div>
      <div className={`text-3xl font-extrabold mt-1 ${isDark ? 'text-[#e4e6eb]' : 'text-inherit'}`}>{count}</div>
    </div>
  );
};

const Th = ({ children, center }) => {
  const { isDark } = useTheme();
  return (
    <th className={`px-6 py-4 text-xs uppercase font-bold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'} ${center ? 'text-center' : 'text-left'}`}>{children}</th>
  );
};

const Td = ({ children, center }) => {
  const { isDark } = useTheme();
  return (
    <td className={`px-6 py-4 text-sm ${isDark ? 'text-[#e4e6eb]' : 'text-inherit'} ${center ? 'text-center' : 'text-left'}`}>{children}</td>
  );
};

export default StaffDashboard;