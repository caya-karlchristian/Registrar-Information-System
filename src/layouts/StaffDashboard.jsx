import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import {
  getDocumentRequests,
  updateDocumentRequest,
} from '../services/API';

/* ---------------- STATUS IDS (MATCH YOUR DB) ---------------- */
const STATUS = {
  PENDING: 1,
  READY: 2,
  COMPLETED: 3,
  PROCESSING: 4,
  REJECTED: 5,
};

const StaffDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

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

        copies: r.number_of_copies || 1,  /* ---------------- UPDATE ---------------- */

        docType: r.certification_type
            ? `Certification: ${r.certification_type.cert_name}`
            : r.documents && r.documents.length > 0
                ? r.documents
                    .map(d => {
                        const name = documentTypeMap[d.document_type_id] || "Unknown Document";
                        const copies = r.number_of_copies || 1; // default 1 if missing
                        return `${name} (${copies} cop${copies > 1 ? 'ies' : 'y'})`;
                    })
                    .join(', ')
                : 'N/A',

        date: r.requested_at
          ? new Date(r.requested_at).toLocaleDateString()
          : 'N/A',
        statusId: r.status?.status_id,
        statusName: r.status?.status_name,
      }));

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

  /* ---------------- STATUS COUNTS ---------------- */
  const pendingCount = requests.filter(r => r.statusId === STATUS.PENDING).length;
  const processingCount = requests.filter(r => r.statusId === STATUS.PROCESSING).length;
  const readyCount = requests.filter(r => r.statusId === STATUS.READY).length;

  /* ---------------- FILTERING ---------------- */
  const filteredData = requests.filter(r => {
    const matchesStatus =
      filterStatus === 'All' || r.statusName === filterStatus;

    const matchesSearch =
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toString().includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

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
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${
          styles[status] ?? 'bg-gray-100 text-gray-600'
        }`}
      >
        {status ?? 'Unknown'}
      </span>
    );
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ---------------- CARDS ---------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="New Requests" count={pendingCount} color="yellow" />
          <StatCard title="Processing" count={processingCount} color="blue" />
          <StatCard title="Ready for Pickup" count={readyCount} color="green" />
        </div>

        {/* ---------------- TOOLBAR ---------------- */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              className="w-full pl-10 pr-3 py-2 border rounded-lg bg-gray-50"
              placeholder="Search ID, Name, Student No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
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
              <option value="Rejected">Rejected</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* ---------------- TABLE ---------------- */}
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <Th>Req ID</Th>
                <Th>Student</Th>
                <Th>Document</Th>
                <Th>Date</Th>
                <Th center> No. of Copies</Th>
                <Th center>Status</Th>
                <Th center>Actions</Th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filteredData.map(req => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <Td>{req.id}</Td>

                  <Td>
                    <div>
                      <div className="font-bold">{req.studentName}</div>
                      <div className="text-xs text-gray-400">
                        {req.studentNumber}
                      </div>
                    </div>
                  </Td>

                  <Td>{req.docType}</Td>
                  <Td>{req.date}</Td>

                  <Td center>
                    <span className="font-semibold text-gray-700">{req.copies}</span>
                  </Td>

                  <Td center>{getStatusBadge(req.statusName)}</Td>

                  <Td center>
                    <div className="flex items-center justify-center gap-2">

                      {/* View */}
                      <button
                        title="View Details"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>

                      {/* PENDING */}
                      {req.statusId === STATUS.PENDING && (
                        <>
                          <button
                            disabled={updatingId === req.id}
                            onClick={() => handleStatusUpdate(req.id, STATUS.PROCESSING)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            Approve
                          </button>

                          <button
                            disabled={updatingId === req.id}
                            onClick={() => handleStatusUpdate(req.id, STATUS.REJECTED)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                          >
                            <XCircleIcon className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}

                      {/* PROCESSING */}
                      {req.statusId === STATUS.PROCESSING && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, STATUS.READY)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Ready
                        </button>
                      )}

                      {/* READY */}
                      {req.statusId === STATUS.READY && (
                        <button
                          disabled={updatingId === req.id}
                          onClick={() => handleStatusUpdate(req.id, STATUS.COMPLETED)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Done
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500 flex justify-between">
            <span>
              Showing {filteredData.length} of {requests.length} results
            </span>
            <div className="flex gap-2">
              <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </main>
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
  <th
    className={`px-6 py-4 text-xs uppercase font-bold text-gray-500 ${
      center ? 'text-center' : 'text-left'
    }`}
  >
    {children}
  </th>
);

const Td = ({ children, center }) => (
  <td
    className={`px-6 py-4 text-sm ${
      center ? 'text-center' : 'text-left'
    }`}
  >
    {children}
  </td>
);

const IconBtn = ({ children, title, onClick, color, disabled }) => {
  const colors = {
    blue: 'text-blue-500 hover:bg-blue-50',
    red: 'text-red-500 hover:bg-red-50',
    green: 'text-green-600 hover:bg-green-50',
  };

  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg ${
        colors[color] ?? 'text-gray-400 hover:bg-gray-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

export default StaffDashboard;
