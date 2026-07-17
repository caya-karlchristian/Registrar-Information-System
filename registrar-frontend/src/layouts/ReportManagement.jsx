import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import ConfirmationModal from '../components/ConfirmationModal';
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import { getAuditLogs, getAuditLogFilters } from "../services/api";
import ErrorToast from "../components/ErrorToast";
import { useTheme } from "../context/ThemeContext";
import { ReportTableSkeleton } from '../components/LoadingSkeleton';
import DashboardDropdown from "../components/DashboardDropdown.jsx";

const PER_PAGE = 10;

const getRoleBadgeClasses = (roleName, isDark) => {
  const role = String(roleName || "").trim().toLowerCase();

  if (role.includes("super")) { // Super Admin
    if (isDark) {
      return 'bg-red-950/40 text-red-400 border-red-800/50';
    }
    return 'bg-red-50 text-[#8B0000]/70 border-red-200';
  }

  if (role.includes("student")) { // Student
    if (isDark) {
      return 'bg-yellow-950/30 text-yellow-400 border-yellow-900/50';
    }
    return 'bg-yellow-50 text-yellow-800 border-yellow-200';
  }

  if (role.includes("alumni")) { // Alumni
    if (isDark) {
      return 'bg-green-950/40 text-green-400 border-green-800/50';
    }
    return 'bg-green-50 text-green-700 border-green-200';
  }

  // Admin / Default
  if (isDark) {
    return 'bg-[#8B0000]/20 text-[#ffb3b3] border-[#8B0000]/30';
  }
  return 'bg-[#8B0000]/10 text-[#8B0000] border-[#8B0000]/20';
};

const formatLabel = (str) => {
  if (!str) return "";
  return str
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

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

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);

  const roleDropdownRef = useRef(null);
  const actionDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setRoleDropdownOpen(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setActionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="w-full flex flex-col font-sans">
      <div className={`rounded-2xl p-4 sm:p-6 ${
        isDark 
          ? 'bg-[#242526] text-[#e4e6eb] border border-[#3e4042]' 
          : 'bg-white text-gray-900 shadow-md border border-gray-200/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0 sm:max-w-xs">
          <VoiceSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              handleFilterChange();
            }}
            placeholder="Search"
          />
        </div>

        {(roleFilter !== 'All' || actionFilter !== 'All' || search.trim() !== '') && (
          <button
            type="button"
            onClick={() => {
              setRoleFilter('All');
              setActionFilter('All');
              setSearch('');
              setCurrentPage(1);
            }}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition-colors border shadow-sm flex items-center justify-center shrink-0
              ${isDark
                ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            Clear Filters
          </button>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          className={`sm:ml-auto w-full sm:w-auto px-5 py-2 rounded-full text-sm font-semibold border shadow-sm transition-all ${isDark ? 'border-red-900/50 text-red-300 bg-[#2a2a2f] hover:bg-[#353539]' : 'border-red-200 text-red-600 bg-white hover:bg-red-50'}`}
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
              <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Timestamp</th>
              <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>User</th>
              <th className="px-4 py-3 text-center">
                <DashboardDropdown
                  isOpen={roleDropdownOpen}
                  setIsOpen={setRoleDropdownOpen}
                  dropdownRef={roleDropdownRef}
                  align="center"
                  trigger={
                    <span className={roleFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                      Role
                    </span>
                  }
                  sections={[
                    {
                      title: 'Filter by Role',
                      items: roleOptions.map(option => ({
                        label: formatLabel(option),
                        isSelected: roleFilter === option,
                        onClick: () => {
                          setRoleFilter(option);
                          handleFilterChange();
                        }
                      }))
                    }
                  ]}
                />
              </th>
              <th className="px-4 py-3 text-center">
                <DashboardDropdown
                  isOpen={actionDropdownOpen}
                  setIsOpen={setActionDropdownOpen}
                  dropdownRef={actionDropdownRef}
                  align="center"
                  trigger={
                    <span className={actionFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                      Action
                    </span>
                  }
                  sections={[
                    {
                      title: 'Filter by Action',
                      items: actionOptions.map(option => ({
                        label: formatLabel(option),
                        isSelected: actionFilter === option,
                        onClick: () => {
                          setActionFilter(option);
                          handleFilterChange();
                        }
                      }))
                    }
                  ]}
                />
              </th>
              <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Browser</th>
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
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getRoleBadgeClasses(log.role, isDark)}`}>
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
    </div>
  );
};

export default ReportManagement;