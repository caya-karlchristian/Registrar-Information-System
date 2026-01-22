import React, { useState, useEffect } from "react";
import { getDocumentRequests } from "../services/API"; 
import { EyeIcon } from '@heroicons/react/24/solid';
import RequestDetailsModal from '../components/RequestDetailModal';

const STATUS_MAP = {
  1: "Pending",
  2: "Ready",
  3: "Completed",
  4: "Processing",
  5: "Rejected",
};

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [viewedRequestId, setViewedRequestId] = useState(null);
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
            status: STATUS_MAP[r.status_id] ?? "Unknown",
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

  const getProgressLabel = (progress) => {
    switch (progress) {
      case 0:
        return "Request was rejected";
      case 25:
        return "Request received and under review";
      case 50:
        return "Your request is being processed";
      case 75:
        return "Preparing your document for pickup";
      case 100:
        return "Document is ready to claim";
      default:
        return "INVALID PROGRESS";
    }
  };


  const filteredRequests = requests.filter((req) => req.type === activeTab);

  return (
    <main className="max-w-6xl mx-auto px-4 relative z-20 mb-5">
      {/* Tabs */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4 place-items-center mb-8">
        {[
          { label: "Pending", value: "pending", color: "yellow" },
          { label: "To Claim", value: "ready", color: "green" },
          { label: "History", value: "history", color: "gray" },
        ].map((tab) => (
          <div key={tab.value} className="w-full flex justify-center">
            <button
              onClick={() => setActiveTab(tab.value)}
              className={`relative w-full max-w-xs p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-3 group ${
                activeTab === tab.value
                  ? `bg-${tab.color}-50 border-${tab.color}-500 shadow-lg scale-105`
                  : `bg-white border-gray-200 hover:bg-${tab.color}-50 hover:border-${tab.color}-200 hover:shadow-md`
              }`}
            >
              <span
                className={`font-bold text-lg ${
                  activeTab === tab.value
                    ? `text-${tab.color}-900`
                    : "text-gray-500"
                }`}
              >
                {tab.label}
              </span>
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
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[65vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {filteredRequests.map((req) => (
              <div
                key={req.request_id}
                className="p-5 hover:bg-gray-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {req.request_id}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(req.requested_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-gray-800 font-bold text-base md:text-lg">
                    {req.purpose_of_request}
                  </h4>
                  <p
                    className={`text-sm font-medium mt-1 ${
                      req.status === "Pending" ? "text-yellow-600" : ""
                    } ${
                      req.status === "Processing" ? "text-blue-600" : ""
                    } ${
                      req.status === "Ready" ? "text-green-600" : ""
                    } ${
                      req.status === "Completed" ? "text-gray-500" : ""
                    } ${
                      req.status === "Rejected" ? "text-red-600" : ""
                    }`}
                  >
                    Status: {req.status}
                  </p>

                </div>

                {["pending", "ready"].includes(req.type) && (
                  <div className="flex items-center gap-2">
                    <button
                      title="View Details"
                      onClick={() => setSelectedRequest(req)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>

                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg items-end"
                      onClick={() =>
                        setViewedRequestId(
                          viewedRequestId === req.request_id ? null : req.request_id
                        )
                      }
                    >
                      {viewedRequestId === req.request_id
                        ? "Hide "
                        : "View"}
                    </button>

                    {viewedRequestId === req.request_id && (
                      <div className="w-full mt-4 md:mt-2">
                        <div className="bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-yellow-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${req.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {getProgressLabel(req.progress)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
