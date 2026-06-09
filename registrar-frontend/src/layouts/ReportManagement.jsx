import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import ConfirmationModal from '../components/ConfirmationModal';
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import { getAuditLogs, getAuditLogFilters } from "../services/api";
import ErrorToast from "../components/ErrorToast";
import { useTheme } from "../context/ThemeContext";
import { ReportTableSkeleton } from '../components/LoadingSkeleton';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { formatLabel } from '../utils/helpers.jsx';

const PER_PAGE = 10;

const ReportManagement = () => {
  const { isDark } = useTheme();
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [currentPage, setCurrentPage]   = useState(1);
  const [logs, setLogs]                 = useState([]);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");

  // Filter options populated from API
  const [roleOptions, setRoleOptions]     = useState(["All"]);
  const [actionOptions, setActionOptions] = useState(["All"]);

  // -------------------------------------------------------
  // Load filter dropdown options once on mount
  // -------------------------------------------------------
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await getAuditLogFilters();
        setRoleOptions(["All", ...res.data.roles]);
        setActionOptions(["All", ...res.data.actions]);
      } catch (err) {
        // Falls back to "All" only if filters fail — non-critical
        setErrorMsg("Failed to load filter options.");
      }
    };
    loadFilters();
  }, []);

  // -------------------------------------------------------
  // Fetch logs whenever filters or page changes
  // -------------------------------------------------------
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        search:   search   || undefined,
        role:     roleFilter   !== "All" ? roleFilter   : undefined,
        action:   actionFilter !== "All" ? actionFilter : undefined,
        page:     currentPage,
        per_page: PER_PAGE,
      });
      setLogs(res.data.data);
      setTotalPages(res.data.meta.last_page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, actionFilter, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => setCurrentPage(1);

  // -------------------------------------------------------
  // Clear logs — NOTE: This only clears the local view.
  // Audit logs should never be deleted from the DB.
  // If you want a real clear, add a backend endpoint for it
  // and discuss with your adviser first.
  // -------------------------------------------------------
  const handleClearLogs = async () => {
    setSearch("");
    setRoleFilter("All");
    setActionFilter("All");
    setCurrentPage(1);
    setShowConfirm(false);
    await fetchLogs();  // ← force a fresh fetch
  };

  const pageNumbers = () => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (currentPage > 4) pages.push("...");
    if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage);
    pages.push("...", totalPages - 1, totalPages);
    return [...new Set(pages)];
  };

  return (
    <div className={`mt-5 min-h-screen font-sans px-4 sm:px-6 ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-[#F5F5F5]'}`}>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-6">

        <div className="mt-6 sm:mt-12 flex-1 min-w-0 sm:min-w-45 sm:max-w-xs">
          <VoiceSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              handleFilterChange();
            }}
            placeholder="Search"
          />
        </div>

        <div className="mt-2 sm:mt-6 flex-1 min-w-0 sm:min-w-45 sm:max-w-xs">
          <DropDown label="Role" name="roleFilter"
            value={roleFilter === "All" ? "" : roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value || "All"); handleFilterChange(); }}
            options={roleOptions.map(r => formatLabel(r))} labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
          />
        </div>

        <div className="mt-2 sm:mt-6 flex-1 min-w-0 sm:min-w-45 sm:max-w-xs">
          <DropDown label="Action" name="actionFilter"
            value={actionFilter === "All" ? "" : actionFilter}
            onChange={(e) => { setActionFilter(e.target.value || "All"); handleFilterChange(); }}
            options={actionOptions.map(a => formatLabel(a))} labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-700'}
          />
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          className={`mt-4 sm:mt-12 w-full sm:w-auto px-5 py-2 rounded-full text-sm font-semibold border shadow-sm transition-all ${isDark ? 'border-red-900/50 text-red-300 bg-[#2a2a2f] hover:bg-[#353539]' : 'border-red-200 text-red-600 bg-white hover:bg-red-50'}`}
        >
          Clear Logs
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#242526] border border-[#3e4042] shadow-none' : 'bg-white shadow-sm border border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-sm">
          <thead>
            <tr className={isDark ? 'border-b border-[#3e4042]' : 'border-b border-gray-100'}>
              {["Timestamp", "User", "Role", "Action", "Browser"].map((h) => (
                <th key={h} className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <ReportTableSkeleton isDark={isDark} count={10} />
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20">
                  <div className="flex flex-col items-center justify-center">
                    {/* Icon container */}
                    <div className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${isDark ? 'bg-[#3a3b3c]/50' : 'bg-gray-100'}`}>
                      <MagnifyingGlassIcon className={`w-8 h-8 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                    </div>
                    {/* Text */}
                    <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                      No Logs Found
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>
                      No audit entries match your current search or filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={`border-b text-center transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#2a2a2f]' : 'border-gray-50 hover:bg-gray-50'}`}>

                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                    {log.date} {log.time}
                  </td>

                  <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>{log.user}</td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${isDark ? 'bg-[#3a2b2b]/20 text-[#ffb3b3] border-[#7a4b4b]' : 'bg-red-50 text-red-400/60 border-red-200'}`}>
                      {formatLabel(log.role)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] border-[#3e4042]' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {formatLabel(log.action)}
                    </span>
                  </td>

                  <td className={`px-4 py-3 text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{log.browser ?? "—"}</td>

                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`flex items-center justify-center gap-1 px-4 py-4 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
            className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            <ChevronLeftIcon className="w-4 h-4" /> Previous
          </button>
          {pageNumbers().map((p, i) => (
            <button key={i} onClick={() => typeof p === "number" && setCurrentPage(p)} disabled={p === "..."}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                ${currentPage === p ? 'bg-yellow-400 text-white' : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-100')}
                ${p === "..." ? "cursor-default pointer-events-none" : ""}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            Next <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleClearLogs}
        title="Clear All Logs?"
        message="This will permanently delete all audit logs. This action cannot be undone."
        type="danger"
      />
      <ErrorToast 
        message={errorMsg} 
        onClose={() => setErrorMsg("")} 
      />
    </div>
  );
};

export default ReportManagement;