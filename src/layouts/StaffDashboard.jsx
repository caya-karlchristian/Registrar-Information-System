import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { getDocumentRequests, 
  updateDocumentRequest, 
  deleteDocumentRequest 
} from '../services/API';
import RequestDetailsModal from '../components/RequestDetailModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

/* ---------------- STATUS IDS ---------------- */
const STATUS = {
  PENDING: 1,
  READY: 2,
  COMPLETED: 3,
  PROCESSING: 4,
  REJECTED: 5,
};

const ITEMS_PER_PAGE = 8;

const StaffDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rawRequests, setRawRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('desc'); // desc or asc
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* ---------------- FETCH DATA ---------------- */
  const fetchData = useCallback(async () => {
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
    try {
      const res = await getDocumentRequests();

      const formatted = res.data.map(r => ({
        id: r.request_id,
        studentName: r.student_profile
          ? `${r.student_profile.first_name} ${r.student_profile.middle_name ?? ''} ${r.student_profile.last_name}`
          : 'N/A',
        studentNumber: r.academic_record?.student_number ?? 'N/A',
        copies: r.number_of_copies || 1,
        docType: (() => {
          const docs = [];
          if (r.certification_type) docs.push(`Certification: ${r.certification_type.cert_name}`);
          if (r.documents && r.documents.length > 0) {
            r.documents.forEach(d => {
              const name = documentTypeMap[d.document_type_id] || "Unknown Document";
              docs.push(name);
            });
          }
          return docs.length > 0 ? docs.join(', ') : 'N/A';
        })(),
        date: r.requested_at
          ? new Date(r.requested_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
          : 'N/A',
        time: r.requested_at
          ? new Date(r.requested_at).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
          : '',

          progress: 
          r.status?.status_id === 1 ? 25 : 
          r.status?.status_id === 4 ? 50 : 
          r.status?.status_id === 2 ? 100 : 
          r.status?.status_id === 3 ? 100 : 0,
          
        statusId: r.status?.status_id,
        statusName: r.status?.status_name,
        timestamp: r.requested_at ? new Date(r.requested_at).getTime() : 0,
      }));

      setRawRequests(res.data);
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
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------------- FILTERED + SORTED DATA ---------------- */
  const filteredData = requests
    .filter(r => {
      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'History' && (r.statusId === STATUS.COMPLETED || r.statusId === STATUS.REJECTED)) ||
        r.statusName === filterStatus;
      const matchesSearch =
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toString().includes(searchTerm);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => (sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp));

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
      Processing: 'bg-blue-100 text-blue-700 border-blue-200',
      'Ready to claim': 'bg-green-100 text-green-700 border-green-200',
      Rejected: 'bg-red-100 text-red-700 border-red-200',
      Completed: 'bg-gray-200 text-gray-700 border-gray-300',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {status ?? 'Unknown'}
      </span>
    );
  };

  // ---------------- BULK DELETE HANDLERS ---------------- */
  // NEED BACKEND SUPPORT FOR BULK DELETE ----- IMPORTANT -----
  // 1. Handle "Select All" checkbox in the header
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentItems.map(item => item.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  // 2. Handle individual row checkbox
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(itemId => itemId !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSelected = async () => {
    try {
      setLoading(true);

      await Promise.all(
        selectedIds.map(id => deleteDocumentRequest(id))
      );

      setSelectedIds([]);
      setShowDeleteConfirm(false);
      await fetchData();

    } catch (err) {
      console.error("Delete failed", err);
      setError("Failed to delete selected requests.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="min-h-screen pb-10">
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ---------------- CARDS ---------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="New Requests" count={requests.filter(r => r.statusId === STATUS.PENDING).length} color="yellow" />
          <StatCard title="Processing" count={requests.filter(r => r.statusId === STATUS.PROCESSING).length} color="blue" />
          <StatCard title="Ready for Pickup" count={requests.filter(r => r.statusId === STATUS.READY).length} color="green" />
        </div>

        {/* ---------------- TOOLBAR ---------------- */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* 1. TOGGLE: Show "Delete Selected" OR "Search Bar" */}
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
            <div className="relative w-full md:w-96">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-gray-50"
                placeholder="Search ID, Name, Student No..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          )} 

          {/* 2. FILTERS: These stay visible all the time */}
          <div className="flex items-center gap-2 relative">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 bg-gray-50 font-semibold"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready to claim">Ready to claim</option>
              <option value="History">History</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="border rounded-lg px-3 py-2 bg-gray-50 font-semibold ml-2"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
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
                    <div>
                      <div className="font-bold">{req.studentName}</div>
                      <div className="text-xs text-gray-400">{req.studentNumber}</div>
                    </div>
                  </Td>
                  <Td>
                    {req.docType.length > 50 ? (
                      <div className="relative group">
                        <span>{req.docType.slice(0, 50)}...</span>
                        <div className="absolute left-0 top-full mt-1 w-max max-w-xs p-2 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {req.docType}
                        </div>
                      </div>
                    ) : (
                      req.docType
                    )}
                  </Td>
                  <Td>
                    <div className="text-xs text-gray-400">{req.date}</div>
                    <div className="text-xs text-gray-400">{req.time}</div>
                  </Td>
                  <Td center><span className="font-semibold text-gray-700">{req.copies}</span><span> ...</span></Td>
                  <Td center>{getStatusBadge(req.statusName)}</Td>
                  <Td center>
                    <div className="flex items-center justify-end gap-2 min-w-[200px]">
                      {req.statusId === STATUS.PENDING && (
                        <>
                          <button
                            disabled={updatingId === req.id}
                            onClick={() => handleStatusUpdate(req.id, STATUS.PROCESSING)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                          >
                            <CheckCircleIcon className="w-4 h-4" /> Approve
                          </button>

                          <button
                            disabled={updatingId === req.id}
                            onClick={() => handleStatusUpdate(req.id, STATUS.REJECTED)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                          >
                            <XCircleIcon className="w-4 h-4" /> Reject
                          </button>
                        </>
                      )}

                      {req.statusId === STATUS.PROCESSING && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, STATUS.READY)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Ready
                        </button>
                      )}

                      {req.statusId === STATUS.READY && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, STATUS.COMPLETED)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Done
                        </button>
                      )}
                      <button
                        title="View Details"
                        onClick={() => setSelectedRequest(rawRequests.find(r => r.request_id === req.id))}
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
