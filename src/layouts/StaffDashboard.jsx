import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  EyeIcon,
  ArrowPathIcon,
  ChevronLeftIcon, 
  ChevronRightIcon,
  ClipboardDocumentCheckIcon 
} from '@heroicons/react/24/solid';
import { getDocumentRequests } from '../services/API';

const StaffDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDocumentRequests();
        // Map API response to simplified objects for table
        const formatted = res.data.map(r => ({
          id: r.request_id,
          studentName: r.student_profile
            ? `${r.student_profile.first_name} ${r.student_profile.middle_name} ${r.student_profile.last_name}`
            : 'N/A',
          studentNumber: r.academic_record?.student_number || 'N/A',
          docType: r.certification_type?.cert_name || 'N/A',
          date: r.requested_at ? new Date(r.requested_at).toLocaleDateString() : 'N/A',
          statusName: r.status?.status_name || 'N/A',
        }));
        setRequests(formatted);
      } catch (error) {
        console.error('Error fetching document requests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Status counts
  const pendingCount = requests.filter(r => r.statusName === 'Pending').length;
  const processingCount = requests.filter(r => r.statusName === 'Processing').length;
  const readyCount = requests.filter(r => r.statusName === 'Ready to claim').length;

  // Filtered table data
  const filteredData = requests.filter(r => {
    const matchesStatus = filterStatus === 'All' || r.statusName === filterStatus;
    const matchesSearch = 
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentNumber.includes(searchTerm) ||
      r.id.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  // Status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>;
      case 'Processing':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Processing</span>;
      case 'Ready to claim':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Ready</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Unknown</span>;
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-10 z-0">
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* --- Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-[6px] border-yellow-400 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">New Requests</h3>
              <p className="text-3xl font-extrabold text-gray-800 mt-1">{pendingCount}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-yellow-500">
              <ArrowPathIcon className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-[6px] border-blue-500 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Processing</h3>
              <p className="text-3xl font-extrabold text-gray-800 mt-1">{processingCount}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-blue-500">
              <ArrowPathIcon className="w-8 h-8 animate-spin-slow" /> 
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-[6px] border-green-500 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ready for Pickup</h3>
              <p className="text-3xl font-extrabold text-gray-800 mt-1">{readyCount}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-green-500">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* --- Toolbar --- */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent sm:text-sm transition-all"
              placeholder="Search by ID, Name, or Req #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-300">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter Status:</span>
              <select 
                className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Requests</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Ready to claim">Ready to claim</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- Data Table --- */}
        <div className="bg-white shadow-md rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Req ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Information</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Document Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map(req => (
                  <tr key={req.id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">{req.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{req.studentName}</span>
                        <span className="text-xs text-gray-400 font-mono mt-0.5">{req.studentNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{req.docType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusBadge(req.statusName)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="View Details">
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        {/* Actions based on status */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination placeholder */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing 1 to {filteredData.length} of {requests.length} results
            </span>
            <div className="flex gap-2">
              <button className="p-2 border border-gray-300 rounded-md bg-white text-gray-400 hover:text-gray-600 disabled:opacity-50">
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button className="p-2 border border-gray-300 rounded-md bg-white text-gray-400 hover:text-gray-600">
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default StaffDashboard;
