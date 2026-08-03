import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAlertToast } from "../context/AlertToastContext";
import { getAccessRequests, approveAccessRequest, rejectAccessRequest } from "../services/api";
import { XMarkIcon } from "@heroicons/react/24/outline";

const STATUS_FILTERS = ["All", "Requested", "Approved", "Rejected", "Fulfilled", "Expired"];

const getStatusBadgeClasses = (status, isDark) => {
  const map = {
    Requested: isDark ? 'bg-amber-900/20 text-amber-400 border-amber-600' : 'bg-amber-100 text-amber-700 border-amber-200',
    Rejected:  isDark ? 'bg-red-950/30 text-red-400 border-red-700' : 'bg-red-100 text-red-700 border-red-200',
    Fulfilled: isDark ? 'bg-green-900/20 text-green-400 border-green-600' : 'bg-green-100 text-green-700 border-green-200',
    Expired:   isDark ? 'bg-gray-700/20 text-gray-300 border-gray-400' : 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return map[status] || (isDark ? 'bg-gray-700/20 text-gray-300 border-gray-400' : 'bg-gray-100 text-gray-700 border-gray-200');
};

/**
 * Super Admin-only review queue for self-service access requests.
 * Rendered as the "Access Requests" tab of UserManagementPage — the
 * whole page is already gated to Super Admin via ProtectedRoute
 * (see App.jsx), so no additional role check is needed here; the
 * backend still enforces it independently (AccessRequestPolicy).
 */
const AccessRequestsQueue = () => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useAlertToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Requested");
  const [actioningId, setActioningId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getAccessRequests(statusFilter !== "All" ? { status: statusFilter } : {})
      .then((res) => setRequests(res.data?.data ?? []))
      .catch(() => showError("Failed to load access requests."))
      .finally(() => setLoading(false));
  }, [statusFilter, showError]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActioningId(id);
    try {
      await approveAccessRequest(id);
      showSuccess("Access request approved — a pending RIS record was created.");
      load();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to approve this request.");
    } finally {
      setActioningId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      showError("Please provide a reason for rejecting this request.");
      return;
    }
    setActioningId(rejectTarget.id);
    try {
      await rejectAccessRequest(rejectTarget.id, rejectReason);
      showSuccess("Access request rejected.");
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to reject this request.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === s
              ? (isDark ? 'bg-yellow-500/20 text-yellow-400 border-yellow-600' : 'bg-pup-dark-maroon text-white border-pup-dark-maroon')
              : (isDark ? 'text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f]' : 'text-gray-600 border-gray-200 hover:bg-gray-50')}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={`text-sm ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>Loading...</p>
      ) : requests.length === 0 ? (
        <p className={`text-sm ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>No access requests found for this filter.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className={`rounded-xl p-4 border ${isDark ? 'border-[#3e4042] bg-[#1c1c1e]' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">{r.target_first_name} {r.target_last_name} · {r.requested_role}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>{r.target_email}</p>
                  {r.requested_policy && (
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>Policy: {r.requested_policy.name}</p>
                  )}
                  <p className={`text-xs mt-2 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>{r.justification}</p>
                  <p className={`text-xs mt-2 ${isDark ? 'text-[#6b6b6b]' : 'text-gray-400'}`}>
                    Requested by {r.requested_by?.name || r.requested_by?.email || 'Unknown'}
                    {r.expires_at && r.status === 'Requested' && ` · expires ${new Date(r.expires_at).toLocaleDateString()}`}
                  </p>
                  {r.status === 'Rejected' && r.rejection_reason && (
                    <p className={`text-xs mt-2 italic ${isDark ? 'text-red-400' : 'text-red-600'}`}>Rejected: {r.rejection_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadgeClasses(r.status, isDark)}`}>
                    {r.status}
                  </span>
                  {r.status === 'Requested' && (
                    <>
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={actioningId === r.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 ${isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectTarget(r)}
                        disabled={actioningId === r.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 ${isDark ? 'bg-red-950/30 text-red-400 hover:bg-red-950/50' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-[#242526] border border-[#3e4042] text-[#e4e6eb]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Reject Access Request</h3>
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-[#3a3b3c]' : 'hover:bg-gray-100'}`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <p className={`text-sm mb-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
              Rejecting the request for <span className="font-semibold">{rejectTarget.target_first_name} {rejectTarget.target_last_name}</span> ({rejectTarget.target_email}). Please provide a reason — this is shown to the requester.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Reason for rejection..."
              autoFocus
              className={`w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-2 ${isDark
                ? 'bg-[#1c1c1e] border-[#3e4042] text-[#e4e6eb] focus:ring-yellow-500/40'
                : 'bg-white border-gray-300 text-gray-900 focus:ring-pup-dark-maroon/30'}`}
            />

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${isDark ? 'text-[#e4e6eb] bg-[#3a3b3c] hover:bg-[#4e4f50] border border-[#4e4f50]' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={actioningId === rejectTarget.id || !rejectReason.trim()}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-colors bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {actioningId === rejectTarget.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRequestsQueue;
