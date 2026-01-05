import React, { useState } from 'react';
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

const StaffDashboard = () => {
  // --- MOCK DATA --- NEED DATABASE AND BACKEND HERE
  const initialRequests = [
    { id: 'REQ-1024', name: 'Adilian Wiarga', studentId: '2021-00123-TG', type: 'Transcript of Records', date: 'Jan 2, 2026', status: 'Pending' },
    { id: 'REQ-1025', name: 'Marlim Alila', studentId: '2021-00456-TG', type: 'Good Moral Cert', date: 'Jan 1, 2026', status: 'Processing' },
    { id: 'REQ-1026', name: 'Anilhamuix Merer', studentId: '2020-00789-TG', type: 'Diploma', date: 'Dec 28, 2025', status: 'Ready to Claim' },
    { id: 'REQ-1027', name: 'Chioriyaon Labraei', studentId: '2022-00111-TG', type: 'Cert of Grades', date: 'Jan 3, 2026', status: 'Pending' },
    { id: 'REQ-1028', name: 'Palalamiar Nangyai', studentId: '2022-00222-TG', type: 'ID Validation', date: 'Jan 3, 2026', status: 'Processing' },
    { id: 'REQ-1029', name: 'Berid Jhaman', studentId: '2019-00333-TG', type: 'Form 137', date: 'Jan 4, 2026', status: 'Pending' },
    { id: 'REQ-1030', name: 'Philipo Vajupeig', studentId: '2019-00444-TG', type: 'Diploma', date: 'Jan 4, 2026', status: 'Ready to Claim' },
    { id: 'REQ-1031', name: 'Juan Cruz', studentId: '2023-00555-TG', type: 'Certificate of Registration', date: 'Jan 5, 2026', status: 'Pending' },
    { id: 'REQ-1032', name: 'Maria Clara', studentId: '2023-00666-TG', type: 'Transcript of Records', date: 'Jan 5, 2026', status: 'Pending' },
  ];

  const [requests, setRequests] = useState(initialRequests);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // --- DYNAMIC CALCULATION LOGIC --- 
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const processingCount = requests.filter(r => r.status === 'Processing').length;
  const readyCount = requests.filter(r => r.status === 'Ready to Claim').length;

  // --- LOGIC: FILTERING TABLE DATA ---
  const filteredData = requests.filter(req => {
    const matchesStatus = filterStatus === 'All' || req.status === filterStatus;
    const matchesSearch = 
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.studentId.includes(searchTerm) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // --- UI HELPER: STATUS BADGES ---
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>;
      case 'Processing':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">Processing</span>;
      case 'Ready to Claim':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Ready</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-10">
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* --- 1. CARDS --- */}
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

        {/* --- 2. TOOLBAR --- */}
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
                      <option value="Ready to Claim">Ready to Claim</option>
                  </select>
                </div>
            </div>
        </div>

        {/* --- 3. DATA TABLE --- */}
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
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
                      {filteredData.map((req) => (
                          <tr key={req.id} className="hover:bg-red-50/30 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                                {req.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900">{req.name}</span>
                                    <span className="text-xs text-gray-400 font-mono mt-0.5">{req.studentId}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                {req.type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {req.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                  {getStatusBadge(req.status)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center gap-2">
                                      {/* View Details Button - need logic when clicked will show the form of the student*/}
                                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="View Details">
                                          <EyeIcon className="w-5 h-5" />
                                      </button>
                                      
                                      {/* ACTION BUTTONS LOGIC */}
                                      {req.status === 'Pending' && (
                                        <>
                                          <button className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm transition-colors" title="Approve">
                                              <CheckCircleIcon className="w-5 h-5" />
                                          </button>
                                          <button className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors" title="Reject">
                                              <XCircleIcon className="w-5 h-5" />
                                          </button>
                                        </>
                                      )}

                                      {req.status === 'Processing' && (
                                        <button className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span>Mark Ready</span>
                                        </button>
                                      )}

                                      {/* CHANGED: Replaced 'No actions' with 'Claimed' Button */}
                                      {req.status === 'Ready to Claim' && (
                                         <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors" title="Mark as Claimed/Done">
                                            <ClipboardDocumentCheckIcon className="w-4 h-4" />
                                            <span>Claimed</span>
                                         </button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                    Showing <span className="font-bold text-gray-900">1</span> to <span className="font-bold text-gray-900">{filteredData.length}</span> of <span className="font-bold text-gray-900">{requests.length}</span> results
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