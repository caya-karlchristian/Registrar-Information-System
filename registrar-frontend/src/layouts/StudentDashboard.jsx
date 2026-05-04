import React, { useState, useEffect, useCallback } from "react";
import { getDocumentRequests } from "../services/api"; 
import { EyeIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import RequestDetailsModal from '../components/RequestDetailModal';
import LoadingOverlay from "../components/LoadingOverlay";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthProvider';
import { DOC_TYPE_MAP, PURPOSE_MAP, STATUS_CONFIG, TAB_MAP, TABS } from '../utils/constants';
import { useNotificationsContext } from '../context/NotificationsContext';

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { user } = useAuth();

  const navigate = useNavigate();
  const { notifications } = useNotificationsContext();

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  const fetchRequests = useCallback(async () => {
  try {
    setLoading(true);
    const res = await getDocumentRequests();

    const studentRequests = (res.data.data ?? res.data)
      .filter(r => r.user_id === user.user_id)
      .map(r => {
        const baseConfig = STATUS_CONFIG[r.status_id] || {
          label: "Unknown",
          classes: "bg-gray-100 text-gray-400 border-gray-200"
        };

        const config = {
          ...baseConfig,
          label: r.status?.status_name ?? baseConfig.label
        };

        const purposeLabel = r.request_purpose?.purpose_name ?? PURPOSE_MAP[r.request_purpose_id] ?? "N/A";

        //Will check first the database, before proceeding to the constant
        const docNames = r.documents?.map(d => {
        const dynamicName = d.document_type?.document_name;
        return dynamicName ?? DOC_TYPE_MAP[d.document_type_id] ?? "Unknown Document";
      })
      .filter(Boolean) || [];

        return {
          ...r,
          config,
          purpose_label: purposeLabel,
          type: TAB_MAP[r.status_id] || "history",
          doc_names: docNames,
        };
      })
      .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

    setRequests(studentRequests);
  } catch (err) {
    console.error("Failed to fetch requests:", err);
  } finally {
    setLoading(false);
  }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

// Refetch only when a notification type that actually affects the request
// list arrives. Prevents unnecessary API calls on unrelated events
// (announcements, generic alerts, etc.) — mirrors StaffDashboard behaviour.
const STUDENT_REFETCH_TRIGGERS = new Set([
  'request_submitted',   // confirmation: own submission landed
  'request_processing',  // admin started processing
  'ready_to_claim',      // ready for pickup
  'request_completed',   // done
  'request_forfeited',   // forfeited / expired
]);

// Hoist into a stable primitive so React's dep-array comparison is reliable.
// Optional-chaining directly in the dep array re-evaluates to `undefined`
// every render when the array is empty, which triggers the effect spuriously.
const latestNotificationId = notifications[0]?.id ?? null;

useEffect(() => {
  if (!user || latestNotificationId === null) return;
  const latest = notifications[0];
  if (latest && STUDENT_REFETCH_TRIGGERS.has(latest.type)) {
    fetchRequests();
  }
// fetchRequests is wrapped in useCallback so its identity is stable;
// include it here to satisfy the exhaustive-deps rule and avoid stale closures.
}, [latestNotificationId, fetchRequests]);

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
      <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-175">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-gray-800 text-lg">
            {activeTab === "pending" && "Processing Requests"}
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
                  onClick={() => setSelectedRequest(req)}
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
                    <h4 className="text-gray-800 font-bold text-base md:text-lg uppercase flex items-center gap-2 flex-wrap">
                      {req.doc_names?.[0] || (req.certificates?.length ? 'CERTIFICATION' : 'N/A')}
                      {(() => {
                        const totalDocs = req.doc_names?.length || 0;
                        const totalCerts = req.certificates?.length || 0;
                        const total = totalDocs + totalCerts;
                        const shownFirst = req.doc_names?.[0] ? 1 : (totalCerts > 0 ? 1 : 0);
                        const remaining = total - shownFirst;
                        return remaining > 0 ? (
                          <span className="text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full normal-case">
                            +{remaining} more
                          </span>
                        ) : null;
                      })()}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Purpose: {req.purpose_label}
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
        <div className="px-4 sm:px-8 py-4 bg-gray-50 text-[11px] sm:text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden border-t border-gray-200">
          <span className="text-center sm:text-left">
            Showing {filteredRequests.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredRequests.length)} of {filteredRequests.length} results
          </span>

          <div className="flex gap-4 items-center">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`p-1 rounded transition-colors ${
                currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-1 rounded transition-colors ${
                currentPage === totalPages || totalPages === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'
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
        user={user}
      />
    </main>
  );
};

export default StudentDashboard;
