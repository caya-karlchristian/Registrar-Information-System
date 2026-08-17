import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAlertToast } from "../context/AlertToastContext";
import { getAccessRequests, approveAccessRequest, rejectAccessRequest } from "../services/api";
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { AccessRequestsSkeleton } from "../components/LoadingSkeleton";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import DashboardDropdown from "../components/DashboardDropdown";
import { formatName } from "../utils/formatters";

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected", "Expired"];

const UI_TO_DB_STATUS = {
  Pending: "Requested",
  Approved: "Fulfilled",
  Rejected: "Rejected",
  Expired: "Expired"
};

const DB_TO_UI_STATUS = {
  Requested: "Pending",
  Fulfilled: "Approved",
  Rejected: "Rejected",
  Expired: "Expired"
};

const getStatusBadgeClasses = (status, isDark) => {
  const map = isDark
    ? {
      Requested: 'bg-yellow-900/20 text-yellow-400 border-yellow-600',
      Rejected: 'bg-red-950/30 text-red-400 border-red-700',
      Fulfilled: 'bg-green-900/20 text-green-400 border-green-600',
      Expired: 'bg-gray-700/20 text-gray-300 border-gray-400',
    }
    : {
      Requested: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      Rejected: 'bg-red-100 text-red-700 border-red-200',
      Fulfilled: 'bg-green-100 text-green-700 border-green-200',
      Expired: 'bg-gray-100 text-gray-700 border-gray-200',
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
const AccessRequestsQueue = ({ onPendingCountChange }) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useAlertToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Filtering & Sorting State
  const [roleFilter, setRoleFilter] = useState("All");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  const [sortOrder, setSortOrder] = useState("asc");

  const load = useCallback(() => {
    setLoading(true);
    const dbStatus = UI_TO_DB_STATUS[statusFilter];
    getAccessRequests(statusFilter !== "All" ? { status: dbStatus } : {})
      .then((res) => {
        const data = res.data?.data ?? [];
        setRequests(data);
        if (onPendingCountChange) {
          if (statusFilter === "Pending") {
            onPendingCountChange(data.length);
          } else {
            getAccessRequests({ status: "Requested" })
              .then((r) => onPendingCountChange(r.data?.data?.length ?? 0))
              .catch(() => {});
          }
        }
      })
      .catch(() => showError("Failed to load access requests."))
      .finally(() => setLoading(false));
  }, [statusFilter, showError, onPendingCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearchQuery("");
    setRoleFilter("All");
    setSortOrder("asc");
  }, [statusFilter]);

  const baseFiltered = requests.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const fullName = formatName(r).toLowerCase();
      const email = (r.target_email || "").toLowerCase();
      const role = (r.requested_role || "Admin").toLowerCase();
      const policyName = (r.requested_policy?.name || "").toLowerCase();
      const justification = (r.justification || "").toLowerCase();
      const requesterName = (r.requested_by?.name || r.requested_by?.email || "Unknown").toLowerCase();
      const requesterEmail = (r.requested_by?.email || "").toLowerCase();

      const match =
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        policyName.includes(query) ||
        justification.includes(query) ||
        requesterName.includes(query) ||
        requesterEmail.includes(query);
      if (!match) return false;
    }

    // Role Filter
    if (roleFilter !== "All") {
      const rRole = r.requested_role || "Admin";
      if (rRole !== roleFilter) return false;
    }

    return true;
  });

  const filteredRequests = [...baseFiltered].sort((a, b) => {
    const nameA = formatName(a);
    const nameB = formatName(b);
    if (sortOrder === "asc") {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

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
    const reason = rejectReason.trim();
    if (!reason) {
      showError("Rejection reason is required.");
      return;
    }
    if (reason.length < 5) {
      showError("Rejection reason must be at least 5 characters.");
      return;
    }

    setActioningId(rejectTarget.id);
    try {
      await rejectAccessRequest(rejectTarget.id, reason);
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
    <div className="w-full flex flex-col font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Access Requests
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-455' : 'text-gray-500'}`}>
            Review self-service requests for new admin or super admin accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          {(roleFilter !== 'All' || statusFilter !== 'Pending' || sortOrder !== 'asc' || searchQuery.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setRoleFilter('All');
                setStatusFilter('Pending');
                setSortOrder('asc');
                setSearchQuery('');
              }}
              className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all cursor-pointer ${isDark ? 'border-gray-700 bg-[#2a2a2f] text-white hover:bg-white/10' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-xl overflow-hidden border ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b ${isDark ? 'border-[#3e4042] bg-[#1a1a1c]/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className="flex items-center gap-2 flex-wrap">
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
          <div className="w-full sm:max-w-xs">
            <VoiceSearchInput
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              placeholder="Search"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-175 text-sm">
            <thead>
              <tr className={`border-b text-xs font-bold uppercase tracking-wider ${isDark ? 'border-[#3e4042] text-[#b0b3b8] bg-[#1a1a1c]/20' : 'border-gray-200 text-gray-500 bg-gray-50/50'
                }`}>
                <th className="px-5 py-4 text-center font-bold w-12">#</th>
                <th className="px-5 py-4 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                    }}
                    className={`flex items-center gap-1 text-xs uppercase font-bold hover:text-[#800000] dark:hover:text-[#FFC72C] transition-colors focus:outline-none cursor-pointer ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}
                  >
                    <span>Target User</span>
                    {sortOrder === 'asc' ? (
                      <ChevronDownIcon className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ChevronUpIcon className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </button>
                </th>

                {/* Requested Access dropdown */}
                <th className="px-5 py-4 text-left font-bold">
                  <DashboardDropdown
                    isOpen={roleDropdownOpen}
                    setIsOpen={setRoleDropdownOpen}
                    dropdownRef={roleDropdownRef}
                    align="left"
                    trigger={
                      <span className={roleFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                        Requested Access
                      </span>
                    }
                    sections={[
                      {
                        title: 'Filter by Role',
                        items: ['All', 'Admin', 'Super Admin'].map(option => ({
                          label: option,
                          isSelected: roleFilter === option,
                          onClick: () => {
                            setRoleFilter(option);
                          }
                        }))
                      }
                    ]}
                  />
                </th>

                <th className="px-5 py-4 text-left font-bold">Justification & Requester</th>
                <th className="px-5 py-4 text-center font-bold">Expiration Date</th>

                {/* Status Filter dropdown */}
                <th className="px-5 py-4 text-center font-bold">
                  <DashboardDropdown
                    isOpen={statusDropdownOpen}
                    setIsOpen={setStatusDropdownOpen}
                    dropdownRef={statusDropdownRef}
                    align="center"
                    trigger={
                      <span className={statusFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                        Status
                      </span>
                    }
                    sections={[
                      {
                        title: 'Filter by Status',
                        items: STATUS_FILTERS.map(option => ({
                          label: option,
                          isSelected: statusFilter === option,
                          onClick: () => {
                            setStatusFilter(option);
                          }
                        }))
                      }
                    ]}
                  />
                </th>
                <th className="px-5 py-4 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AccessRequestsSkeleton isDark={isDark} />
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <svg className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p className={`text-base font-semibold ${isDark ? 'text-[#e4e6eb]' : 'text-gray-900'}`}>
                        {searchQuery ? "No Matching Results" : "No Access Requests"}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>
                        {searchQuery
                          ? `No requests match "${searchQuery}".`
                          : "No access requests found for this filter status."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r, idx) => {
                  const fullName = formatName(r);
                  const requesterName = r.requested_by?.name || r.requested_by?.email || 'Unknown';

                  return (
                    <tr
                      key={r.id}
                      className={`border-b last:border-0 transition-colors ${isDark
                          ? 'border-[#3e4042] hover:bg-[#2a2a2f]'
                          : 'border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                      {/* Number Column */}
                      <td className="px-5 py-4 align-middle text-center">
                        <span className="font-semibold text-xs text-gray-500 dark:text-gray-400">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Target User */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-semibold text-sm">{fullName}</div>
                        <div className={`text-xs mt-0.5 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>{r.target_email}</div>
                      </td>

                      {/* Requested Access */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-semibold text-sm">{r.requested_role || 'Admin'}</div>
                        {r.requested_policy && (
                          <div className={`text-xs mt-0.5 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>
                            Policy: <span className="font-semibold">{r.requested_policy.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Justification & Requester */}
                      <td className="px-5 py-4 align-top max-w-xs md:max-w-md">
                        <div className={`text-xs leading-relaxed ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
                          {r.justification}
                        </div>
                        <div className={`text-[10px] mt-2 flex flex-col gap-0.5 ${isDark ? 'text-[#6b6b6b]' : 'text-gray-400'}`}>
                          <div>Requested by: <span className="font-semibold">{requesterName}</span></div>
                          {r.status === 'Rejected' && r.rejection_reason && (
                            <div className={`italic font-semibold ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                              Reason: {r.rejection_reason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiration Date */}
                      <td className="px-5 py-4 align-middle text-center font-semibold text-xs whitespace-nowrap">
                        {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4 align-middle text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap inline-block ${getStatusBadgeClasses(r.status, isDark)}`}>
                          {DB_TO_UI_STATUS[r.status] || r.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-middle text-center">
                        {r.status === 'Requested' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={actioningId === r.id}
                              className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isDark
                                  ? 'bg-green-900/20 hover:bg-green-900/30 text-green-400 border border-green-600'
                                  : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                              <CheckCircleIcon className="w-4 h-4" /> Approve
                            </button>
                            <button
                              onClick={() => setRejectTarget(r)}
                              disabled={actioningId === r.id}
                              className={`flex items-center gap-1 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isDark
                                  ? 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border border-red-700'
                                  : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                              <XCircleIcon className="w-4 h-4" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`}
            onClick={() => { setRejectTarget(null); setRejectReason(""); setValidationError(""); }}
          />
          <div className={`relative rounded-2xl shadow-2xl w-full max-w-lg mx-auto flex flex-col overflow-visible ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>
            
            {/* Header */}
            <div className={`px-6 py-5 flex items-center justify-between rounded-t-2xl shrink-0 ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon text-white'}`}>
              <div>
                <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                  Reject Access Request
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                  Please provide a valid reason for rejecting this request
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="h-1 w-full shrink-0 bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1f1f1f]/60 border-[#3e4042]' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs uppercase font-bold tracking-wider mb-2 text-gray-500">Target User</div>
                <div className="font-semibold text-sm">{[rejectTarget.target_first_name, rejectTarget.target_middle_name, rejectTarget.target_last_name, rejectTarget.target_suffix].filter(Boolean).join(" ")}</div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-550'}`}>{rejectTarget.target_email}</div>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#b0b3b8]' : 'text-gray-655'} mb-1.5`}>
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder="Provide a specific justification for rejecting this access request..."
                  autoFocus
                  className={`w-full px-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${isDark
                      ? 'bg-[#1f1f1f] text-[#e4e6eb] placeholder-[#9a9a9a] focus:ring-[#FFD700] border border-[#3e4042]'
                      : 'bg-white text-gray-700 placeholder-gray-400 focus:ring-[#FFC72C] border border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 pb-6 pt-4 flex items-center justify-end gap-3 border-t shrink-0 rounded-b-2xl ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={actioningId === rejectTarget.id}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isDark
                  ? 'bg-[#2a2a2f] text-red-400 hover:bg-[#353539] border border-[#3e4042]'
                  : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {actioningId === rejectTarget.id ? "Rejecting..." : "Reject Request"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRequestsQueue;