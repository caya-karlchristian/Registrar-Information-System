import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import { getAuditLogs, getAuditLogFilters } from "../services/api";
import ErrorToast from "../components/ErrorToast";
import SuccessToast from "../components/SuccessToast";
import LogbookDateRangeModal from "../components/LogbookDateRangeModal.jsx";
import { useTheme } from "../context/ThemeContext";
import { ReportTableSkeleton } from '../components/LoadingSkeleton';
import DashboardDropdown from "../components/DashboardDropdown.jsx";
import auditLogSheet from "../utils/auditLogSheet.js";

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

const getActionBadgeClasses = (actionName, isDark) => {
  const act = String(actionName || "").trim().toLowerCase();

  if (act.includes('delete') || act.includes('revok') || act.includes('expir') || act.includes('reject')) {
    if (isDark) {
      return 'bg-rose-950/40 text-rose-400 border-rose-800/50';
    }
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }

  if (act.includes('creat') || act.includes('assign') || act.includes('grant') || act.includes('approv') || act.includes('restor')) {
    if (isDark) {
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (act.includes('login') || act.includes('logout') || act.includes('switch')) {
    if (isDark) {
      return 'bg-blue-950/40 text-blue-400 border-blue-800/50';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }

  if (act.includes('status') || act.includes('chang') || act.includes('edit') || act.includes('updat')) {
    if (isDark) {
      return 'bg-amber-950/40 text-amber-400 border-amber-800/50';
    }
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }

  if (isDark) {
    return 'bg-[#2a2a2f] text-[#e4e6eb] border-[#3e4042]';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200';
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
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter]           = useState("All");
  const [actionFilter, setActionFilter]       = useState("All");
  const [browserFilter, setBrowserFilter]     = useState("All");
  const [dateFrom, setDateFrom]               = useState("");
  const [dateTo, setDateTo]                   = useState("");
  const [activePreset, setActivePreset]       = useState("");
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [currentPage, setCurrentPage]         = useState(1);
  const [logs, setLogs]                       = useState([]);
  const [totalPages, setTotalPages]           = useState(1);
  const [loading, setLoading]                 = useState(false);
  const [exporting, setExporting]             = useState(false);
  const [errorMsg, setErrorMsg]               = useState("");
  const [successMsg, setSuccessMsg]           = useState("");

  // Filter options populated from API
  const [roleOptions, setRoleOptions]       = useState(["All"]);
  const [actionOptions, setActionOptions]   = useState(["All"]);
  const [browserOptions, setBrowserOptions] = useState(["All"]);

  const [roleDropdownOpen, setRoleDropdownOpen]       = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen]   = useState(false);
  const [browserDropdownOpen, setBrowserDropdownOpen] = useState(false);

  const roleDropdownRef    = useRef(null);
  const actionDropdownRef  = useRef(null);
  const browserDropdownRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setRoleDropdownOpen(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setActionDropdownOpen(false);
      }
      if (browserDropdownRef.current && !browserDropdownRef.current.contains(event.target)) {
        setBrowserDropdownOpen(false);
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
        setRoleOptions(["All", ...(res.data.roles || [])]);
        setActionOptions(["All", ...(res.data.actions || [])]);
        setBrowserOptions(["All", ...(res.data.browsers || [])]);
      } catch (err) {
        // Falls back to "All" only if filters fail — non-critical
        setErrorMsg("Failed to load filter options.");
      }
    };
    loadFilters();
  }, []);

  // -------------------------------------------------------
  // Fetch logs whenever filters, date range, or page changes
  // -------------------------------------------------------
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        search:   debouncedSearch || undefined,
        role:     roleFilter    !== "All" ? roleFilter    : undefined,
        action:   actionFilter  !== "All" ? actionFilter  : undefined,
        browser:  browserFilter !== "All" ? browserFilter : undefined,
        from:     dateFrom || undefined,
        to:       dateTo   || undefined,
        page:     currentPage,
        per_page: PER_PAGE,
      });
      setLogs(res.data.data || []);
      setTotalPages(res.data.meta?.last_page || 1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, actionFilter, browserFilter, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => setCurrentPage(1);

  const handleApplyDateFilter = (start, end, preset) => {
    setDateFrom(start);
    setDateTo(end);
    setActivePreset(preset);
    handleFilterChange();
    setIsDateModalOpen(false);
  };

  const handleExportSheet = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      let allLogs = [];
      let page = 1;
      let lastPage = 1;
      const MAX_PAGES = 50;

      while (page <= lastPage && page <= MAX_PAGES) {
        const res = await getAuditLogs({
          search:   debouncedSearch || undefined,
          role:     roleFilter    !== "All" ? roleFilter    : undefined,
          action:   actionFilter  !== "All" ? actionFilter  : undefined,
          browser:  browserFilter !== "All" ? browserFilter : undefined,
          from:     dateFrom || undefined,
          to:       dateTo   || undefined,
          page:     page,
          per_page: 100,
        });

        const data = res.data.data || [];
        allLogs = allLogs.concat(data);
        lastPage = res.data.meta?.last_page || 1;
        if (data.length === 0 || page >= lastPage) break;
        page++;
      }

      if (allLogs.length === 0) {
        setErrorMsg("No logs available to export.");
        return;
      }

      const rangeLabel =
        dateFrom && dateTo
          ? `${dateFrom}_to_${dateTo}`
          : dateFrom
          ? `from_${dateFrom}`
          : dateTo
          ? `to_${dateTo}`
          : null;

      await auditLogSheet(allLogs, {
        dateRangeLabel: rangeLabel,
        roleFilter,
        actionFilter,
        browserFilter,
        search: debouncedSearch,
      });

      setSuccessMsg("Exporting Report completed.");
    } catch (err) {
      console.error("Export to Spreadsheet failed", err);
      setErrorMsg("Exporting Report failed.");
    } finally {
      setExporting(false);
    }
  };

  const isFiltered =
    roleFilter !== "All" ||
    actionFilter !== "All" ||
    browserFilter !== "All" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    search.trim() !== "";

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0 max-w-full sm:max-w-xs">
            <VoiceSearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                handleFilterChange();
              }}
            placeholder="Search"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsDateModalOpen(true)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer ${
                dateFrom || dateTo
                  ? isDark
                    ? 'bg-yellow-950/40 text-yellow-400 border-yellow-800/50'
                    : 'bg-yellow-50 text-[#8B0000] border-yellow-300'
                  : isDark
                  ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>
                {dateFrom && dateTo
                  ? `${dateFrom} to ${dateTo}`
                  : dateFrom
                  ? `From ${dateFrom}`
                  : dateTo
                  ? `To ${dateTo}`
                  : "Date Range"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportSheet}
              disabled={loading || exporting || logs.length === 0}
              title="Export report to Spreadsheet (.xlsx)"
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-[#800000] text-white hover:bg-[#6b0000] border-[#9a0000]'
                  : 'bg-[#800000] text-white hover:bg-[#6b0000] border-[#800000]'
              }`}
            >
              <ArrowDownTrayIcon className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Exporting…' : 'Export Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLogs()}
              disabled={loading}
              title="Refresh logs"
              className={`p-2 rounded-lg border shadow-sm flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin text-yellow-500' : ''}`} />
            </button>

            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setRoleFilter('All');
                  setActionFilter('All');
                  setBrowserFilter('All');
                  setDateFrom('');
                  setDateTo('');
                  setActivePreset('');
                  setSearch('');
                  setDebouncedSearch('');
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors border shadow-sm flex items-center justify-center cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-[#1f1f1f] text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f] hover:text-[#e4e6eb]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Clear Filters
              </button>
            )}
          </div>
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
                  <th className="px-4 py-3 text-center">
                    <DashboardDropdown
                      isOpen={browserDropdownOpen}
                      setIsOpen={setBrowserDropdownOpen}
                      dropdownRef={browserDropdownRef}
                      align="center"
                      trigger={
                        <span className={browserFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                          Browser
                        </span>
                      }
                      sections={[
                        {
                          title: 'Filter by Browser',
                          items: browserOptions.map(option => ({
                            label: option,
                            isSelected: browserFilter === option,
                            onClick: () => {
                              setBrowserFilter(option);
                              handleFilterChange();
                            }
                          }))
                        }
                      ]}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <ReportTableSkeleton isDark={isDark} count={PER_PAGE} />
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20">
                      <div className="flex flex-col items-center justify-center">
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

                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                        {log.user}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getRoleBadgeClasses(log.role, isDark)}`}>
                          {formatLabel(log.role)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getActionBadgeClasses(log.action, isDark)}`}>
                          {formatLabel(log.action)}
                        </span>
                      </td>

                      <td className={`px-4 py-3 text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                        {log.browser ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={`flex items-center justify-center gap-1 px-4 py-4 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}
              className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
              <ChevronLeftIcon className="w-4 h-4" /> Previous
            </button>
            {pageNumbers().map((p, i) => (
              <button key={i} onClick={() => typeof p === "number" && setCurrentPage(p)} disabled={p === "..." || loading}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${currentPage === p ? 'bg-yellow-400 text-white' : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-100')}
                  ${p === "..." ? "cursor-default pointer-events-none" : ""}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0 || loading}
              className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
              Next <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <LogbookDateRangeModal
          isOpen={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          onConfirm={handleApplyDateFilter}
          initialDateFrom={dateFrom}
          initialDateTo={dateTo}
          initialActivePreset={activePreset}
          isDark={isDark}
        />

        <SuccessToast message={successMsg} onClose={() => setSuccessMsg("")} />
        <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
      </div>
    </div>
  );
};

export default ReportManagement;