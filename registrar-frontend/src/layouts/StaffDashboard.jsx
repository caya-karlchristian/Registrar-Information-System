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
import CertificateModal from '../components/CertificateModal.jsx';
import { DOC_TYPE_MAP } from '../utils/constants';
import VoiceSearchInput from '../components/VoiceSearchInput.jsx';
import { useNotificationsContext } from '../context/NotificationsContext';
import DropdownGroup from '../components/DropDown.jsx';

const STATUS_FALLBACK = {
  PENDING: 1,
  READY: 2,
  COMPLETED: 3,
  FORFEITED: 6,
};

const ITEMS_PER_PAGE = 5;

const StaffDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('Descending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [certRequest, setCertRequest] = useState(null);
  const [requestStatuses, setRequestStatuses] = useState([]);

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
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsRes, statusesRes] = await Promise.all([
        getDocumentRequests(),
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

      const formatted = (requestsRes.data || []).map(r => {
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

        const finalCertName = r.certification_type?.cert_name || null;

        const isCertificate = Boolean(
          r.certification_type ||
            r.documents?.some(d => {
              const name =
                d.document_type?.document_name?.toLowerCase() ||
                DOC_TYPE_MAP[d.document_type_id]?.toLowerCase() ||
                '';

              return name.includes('cert');
            })
        );

        const getDocName = d =>
          d.document_type?.document_name ||
          DOC_TYPE_MAP[d.document_type_id] ||
          `Unknown Doc (ID: ${d.document_type_id})`;

        const totalCopies = r.documents?.reduce((sum, d) => sum + (Number(d.number_of_copies) || 1), 0) || 1;

        const documentDetailsArray = (() => {
          const docs = [];
          if (r.certification_type) docs.push(`Certification: ${r.certification_type.cert_name}`);
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
            : 'N/A',
          studentNumber: r.academic_record?.student_number ?? 'N/A',
          certName: finalCertName,
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
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch whenever a new notification arrives (e.g. new request submitted)
  useEffect(() => {
    if (notifications.length > 0) fetchData();
  }, [notifications.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortOrder]);

  /* ---------------- STATUS UPDATE ---------------- */
  const handleStatusUpdate = async (id, newStatusId) => {
    try {
    setUpdatingId(id);
    await updateDocumentRequest(id, { status_id: newStatusId });
    await fetchData();
    } catch (error) {
    console.error('Status update failed:', error);
    alert('Error: ' + error.message);
    } finally {
    setUpdatingId(null);
    }
  };

  /* ---------------- FILTERED + SORTED DATA ---------------- */
  const statusFilterOptions = (() => {
    const dbStatusNames = requestStatuses
      .map(s => s?.status_name)
      .filter(Boolean);

    const visibleStatuses = dbStatusNames.filter(
      name => !['completed', 'forfeited'].includes(String(name).toLowerCase())
    );

    const uniqueVisibleStatuses = [...new Set(visibleStatuses)];
    return uniqueVisibleStatuses.length > 0
      ? ['All', ...uniqueVisibleStatuses, 'Completed']
      : ['All', 'Pending', 'Ready to claim', 'Completed'];
  })();

  const filteredData = requests
    .filter(r => {
      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Completed' && r.statusId === resolvedStatusIds.COMPLETED) ||
        r.statusName === filterStatus;
      const matchesSearch =
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toString().includes(searchTerm);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => (sortOrder === 'Ascending' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp));

  /* ---------------- PAGINATION ---------------- */
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const handleNextPage = () => currentPage < totalPages && setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => currentPage > 1 && setCurrentPage(prev => prev - 1);

  /* ---------------- STATUS BADGE ---------------- */
  const getStatusBadge = status => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Ready to claim': 'bg-green-100 text-green-700 border-green-200',
      Completed: 'bg-gray-200 text-gray-700 border-gray-300',
      Forfeited: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
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
      setLoading(true);
      await Promise.all(selectedIds.map(id => deleteDocumentRequest(id)));
      setSelectedIds([]);
      setShowDeleteConfirm(false);
      await fetchData();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToolbarDropdownChange = (e) => {
    const { name, value } = e.target;
    name === 'filterStatus' ? setFilterStatus(value) : setSortOrder(value);
  };

  return (
    <div className="relative min-h-screen pb-10 z-20">
      <main className="max-w-7xl mx-auto px-6 ">
        <LoadingOverlay isVisible={loading} message="Fetching Request Records..." />

        {/* ---------------- CARDS ---------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard title="New Requests" count={requests.filter(r => r.statusId === resolvedStatusIds.PENDING).length} color="yellow" />
          <StatCard title="Ready for Pickup" count={requests.filter(r => r.statusId === resolvedStatusIds.READY).length} color="green" />
        </div>

        {/* ---------------- TOOLBAR ---------------- */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-4 bg-red-50 p-2 rounded-lg border border-red-100">
              <span className="text-red-700 font-bold text-sm ml-2">{selectedIds.length} Selected</span>
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                <TrashIcon className="w-4 h-4" /> Delete Selected
              </button>
            </div>
          ) : (
            <VoiceSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search"
              language="en-US"
            />
          )} 

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 -mt-4 w-full md:w-auto md:min-w-95">
            <DropdownGroup
              label="Status"
              name="filterStatus"
              value={filterStatus}
              onChange={handleToolbarDropdownChange}
              options={statusFilterOptions}
              labelColor="text-gray-600"
            />

            <DropdownGroup
              label="Sort"
              name="sortOrder"
              value={sortOrder}
              onChange={handleToolbarDropdownChange}
              options={['Descending', 'Ascending']}
              labelColor="text-gray-600"
            />
          </div>
        </div>

        {/* ---------------- TABLE ---------------- */}
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={currentItems.length > 0 && selectedIds.length === currentItems.length}
                  />
                </th>
                <Th>Req ID</Th>
                <Th>Student</Th>
                <Th>Document</Th>
                <Th>Date & Time</Th>
                <Th center>No. of Copies</Th>
                <Th center>Status</Th>
                <Th center>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentItems.map(req => (
                <tr key={req.id} className={`hover:bg-gray-50 ${selectedIds.includes(req.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      checked={selectedIds.includes(req.id)}
                      onChange={() => handleSelectOne(req.id)}
                    />
                  </td>
                  <Td>{req.id}</Td>
                  <Td>
                    <div className="font-bold">{req.studentName}</div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {req.documentDetailsArray[0]}
                      </span>

                      {req.documentDetailsArray.length > 1 && (
                        <span className="text-xs text-gray-400">
                          +{req.documentDetailsArray.length - 1} more
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-xs text-gray-400">{req.date}</div>
                    <div className="text-xs text-gray-400">{req.time}</div>
                  </Td>
                  <Td center><span className="font-semibold text-gray-700">{req.copies}</span></Td>
                  <Td center>{getStatusBadge(req.statusName)}</Td>
                  <Td center>
                    <div className="flex items-center justify-end gap-2 min-w-37.5">
                      {req.isCertificate && (
                        <button
                          title="Generate Certificate"
                          onClick={() => {
                            setCertRequest(req);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      )}
                      {req.statusId === resolvedStatusIds.PENDING && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, resolvedStatusIds.READY)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Ready
                        </button>
                      )}

                      {req.statusId === resolvedStatusIds.READY && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, resolvedStatusIds.COMPLETED)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Done
                        </button>
                      )}              
                      <button
                        title="View Details"
                        onClick={() => setSelectedRequest(req.rawRequest)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
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
          <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
            <span>
              Showing {filteredData.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} results
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-1 rounded ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              <span className="text-xs font-semibold mx-2">
                Page {currentPage} of {totalPages || 1}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-1 rounded ${currentPage === totalPages || totalPages === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <ChevronRightIcon className="w-5 h-5" />
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
          onClose={() => setCertRequest(null)}
        />
      )}
    </div>
  );
};

/* ---------------- REUSABLE COMPONENTS ---------------- */
const StatCard = ({ title, count, color }) => {
  const colors = {
    yellow: 'border-yellow-400 text-yellow-500',
    blue: 'border-blue-500 text-blue-500',
    green: 'border-green-500 text-green-500',
  };
  return (
    <div className={`bg-white p-6 rounded-xl shadow border-l-4 ${colors[color]}`}>
      <div className="text-xs uppercase text-gray-400 font-bold">{title}</div>
      <div className="text-3xl font-extrabold mt-1">{count}</div>
    </div>
  );
};

const Th = ({ children, center }) => (
  <th className={`px-6 py-4 text-xs uppercase font-bold text-gray-500 ${center ? 'text-center' : 'text-left'}`}>{children}</th>
);

const Td = ({ children, center }) => (
  <td className={`px-6 py-4 text-sm ${center ? 'text-center' : 'text-left'}`}>{children}</td>
);

export default StaffDashboard;