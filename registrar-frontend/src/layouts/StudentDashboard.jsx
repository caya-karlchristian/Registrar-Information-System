import React, { useState, useEffect } from "react";
import { getDocumentRequests} from "../services/API"; 
import { EyeIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import RequestDetailsModal from '../components/RequestDetailModal';
import LoadingOverlay from "../components/LoadingOverlay";
import ErrorToast from "../components/ErrorToast";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthProvider';

const STATUS_CONFIG = {
  1: { label: "Pending", classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  2: { label: "Ready", classes: "bg-green-100 text-green-700 border-green-200" },
  3: { label: "Completed", classes: "bg-gray-100 text-gray-700 border-gray-200" },
  4: { label: "Processing", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  5: { label: "Rejected", classes: "bg-red-100 text-red-700 border-red-200" },
};

const TABS = [
  { 
    label: "Ongoing", 
    value: "pending", 
    active: "bg-yellow-50 border-yellow-500 text-yellow-900", 
    inactive: "bg-white border-gray-200 text-gray-500 hover:bg-yellow-50" 
  },
  { 
    label: "To Claim", 
    value: "ready", 
    active: "bg-green-50 border-green-500 text-green-900", 
    inactive: "bg-white border-gray-200 text-gray-500 hover:bg-green-50" 
  },
  { 
    label: "History", 
    value: "history", 
    active: "bg-gray-100 border-gray-500 text-gray-900", 
    inactive: "bg-white border-gray-200 text-gray-500 hover:bg-gray-50" 
  },
];

const TAB_MAP = {
  1: "pending",
  4: "pending",
  2: "ready",
  3: "history",
  5: "history"
};

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { user } = useAuth();



  const navigate = useNavigate();

  useEffect(() => {
  if (!user) {
    navigate("/");
  }
}, [user, navigate]);


  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await getDocumentRequests();
        // Filter requests for the current student
        const studentRequests = res.data
        .filter(r => r.user_id === user.user_id)
          .map((r) => {

            const config = STATUS_CONFIG[r.status_id] || { 
              label: "Unknown", 
              classes: "bg-gray-100 text-gray-400 border-gray-200" 
            };

            const progressMap = { 1: 25, 4: 50, 2: 100, 3: 100, 5: 0 };

            return {
              ...r,
              status_label: config.label,
              config: config,   
              type: TAB_MAP[r.status_id] || "history",
              progress: progressMap[r.status_id] || 0,
            };
          });
        setRequests(studentRequests);
      } catch (err) {
        console.error("Failed to fetch document requests.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  useEffect(() => { 
    setCurrentPage(1);
  }, [activeTab]);

  const filteredRequests = requests.filter((req) => req.type === activeTab);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <main className="max-w-6xl mx-auto -mt-1 relative z-20  ">
      <LoadingOverlay isVisible={loading} message="Syncing Requested Documents..." />

      {/* <ErrorToast message={error} onClose={() => setError("")} /> */}
      <div className="grid grid-cols-3 gap-4 place-items-center mb-5">
        {TABS.map((tab) => (
          <div key={tab.value} className="w-full flex justify-center">
            <button
              onClick={() => setActiveTab(tab.value)}
              className={`relative w-full max-w-xs p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-3 group ${
                activeTab === tab.value ? `${tab.active} shadow-lg scale-105` : `${tab.inactive} hover:shadow-md`
              }`}
            >
              <span className="font-bold text-lg">{tab.label}</span>
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                {requests.filter((req) => req.type === tab.value).length}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Document Requests List */}
      <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[700px]">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-800 text-lg">
            {activeTab === "pending" && "Processing Documents"}
            {activeTab === "ready" && "Documents Ready for Pickup"}
            {activeTab === "history" && "Transaction Archive"}
          </h3>
          <span className="text-xs text-gray-400">
            Showing {filteredRequests.length} records
          </span>
        </div>
        
        <div className="flex-1 flex flex-col justify-start divide-y divide-gray-100 overflow-y-auto">
            {loading ? (
              <div className="p-10 text-center text-gray-400">Loading...</div>
            ) : currentItems.length === 0 ? (
              <div className="p-10 text-center text-gray-400 font-black uppercase tracking-widest">No records found.</div>
            ) : (
              currentItems.map((req) => (
                <div
                  key={req.request_id}
                  className="p-5 hover:bg-gray-50 transition flex flex-row justify-between items-center gap-4"
                >
                  {/* Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${req.config.classes}`}>
                        {req.config.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{req.request_id} • {new Date(req.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-gray-800 font-bold text-base md:text-lg uppercase">
                      Document name here
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Purpose: {req.purpose_of_request}
                    </p>
                  </div>

                  {/* Action Icon */}
                  <div className="shrink-0">
                    <button onClick={() => setSelectedRequest(req)} className="p-2 text-gray-400 hover:text-gray-600 transition">
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

      {/* Paginated Footer */}
      {!loading && filteredRequests.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500 flex justify-between items-center shrink-0">
          <span>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRequests.length)} of {filteredRequests.length} results
          </span>

          <div className="flex gap-2 items-center">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`p-1 rounded ${
                currentPage === 1 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold mx-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-1 rounded ${
                currentPage === totalPages || totalPages === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-200 '
              }`}
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      </div>
      <RequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </main>
  );
};

export default StudentDashboard;
