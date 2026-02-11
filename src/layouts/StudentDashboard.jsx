import React, { useState, useEffect } from "react";
import { getDocumentRequests} from "../services/API"; 
import { EyeIcon } from '@heroicons/react/24/solid';
import RequestDetailsModal from '../components/RequestDetailModal';

// ADD: Full Tailwind strings so they are detected by the compiler
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

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  // For testing, assume student_profile_id = 1 is the logged-in student
  const currentStudentId = 1;

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await getDocumentRequests();
        // Filter requests for the current student
        const studentRequests = res.data
          .filter((r) => r.student_profile_id === currentStudentId)
          .map((r) => ({
            ...r,
            document_name: "Document Name Here", // Placeholder for document name
            // status: STATUS_MAP[r.status_id] ?? "Unknown",
            config: STATUS_CONFIG[r.status_id] || { label: "Unknown", color: "gray" },
            type:
            r.status_id === 1 || r.status_id === 4
              ? "pending"
              : r.status_id === 2
              ? "ready"
              : "history",

          progress:
            r.status_id === 1
              ? 25
              : r.status_id === 4
              ? 50
              : r.status_id === 2
              ? 100
              : r.status_id === 3
              ? 100
              : 0, // rejected

          }));
        setRequests(studentRequests);
        setError("");
      } catch (err) {
        console.error("Failed to fetch document requests:", err);
        setError("Failed to fetch document requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((req) => req.type === activeTab);

  return (
    <main className="max-w-6xl mx-auto -mt-1 relative z-20  ">
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 text-lg">
            {activeTab === "pending" && "Processing Documents"}
            {activeTab === "ready" && "Documents Ready for Pickup"}
            {activeTab === "history" && "Transaction Archive"}
          </h3>
          <span className="text-xs text-gray-400">
            Showing {filteredRequests.length} records
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 flex justify-center items-center">
            Loading...
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-600 font-semibold flex justify-center items-center">
            {error}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-10 text-center text-gray-400 flex justify-center items-center">
            No records found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[55vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {filteredRequests.map((req) => (
              <div
                key={req.request_id}
                className="p-5 hover:bg-gray-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`
                      inline-block px-1 py-0.5 rounded-full text-[11px] font-bold border
                      bg-${req.config.color}-100 
                      text-${req.config.color}-700 
                      border-${req.config.color}-200
                    `}>
                      {req.config.label}
                    </span>
                    <span className="text-xs text-gray-400  rounded">
                      #{req.request_id}
                    
                    <span className="text-xs text-gray-400 px-0.5 " >
                      • {new Date(req.requested_at).toLocaleDateString()}
                    </span>
                    </span>
                  </div>
                  {/* 4. SHOW DOCUMENT NAME AS TITLE */}
                  <h4 className="text-gray-800 font-bold text-base md:text-lg">
                    DOCUMENT NAME
                  </h4>
                  {/* SHOW PURPOSE AS SUBTITLE */}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Purpose: {req.purpose_of_request}
                  </p>
                </div>

                  <div className="flex items-center gap-2">
                    <button
                      title="View Details"
                      onClick={() => setSelectedRequest(req)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>     
                                 
                  </div>
              </div>
            ))}
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
