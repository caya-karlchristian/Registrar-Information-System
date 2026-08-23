import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import ConfirmationModal from '../components/ConfirmationModal';
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import {
  getAuditLogs, getAuditLogFilters,
  getSecurityEvents, getSecurityEventFilters,
} from "../services/api";
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

// Security-event badge: quieter palette on purpose (per plan doc 3g —
// "a small, quiet list, not a dashboard"). Amber only for the reasons
// that plausibly indicate an actual attempt against a real account
// (bad password / IDP unreachable); everything else (e.g. an email that
// doesn't exist) stays neutral-gray so a single typo doesn't read as
// alarming as a real brute-force signal.
const getEventBadgeClasses = (eventType, isDark) => {
  const type = String(eventType || "").trim().toLowerCase();

  if (type.includes("idp")) {
    if (isDark) return 'bg-orange-950/40 text-orange-400 border-orange-800/50';
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }

  // login_failed and anything else
  if (isDark) return 'bg-[#2a2a2f] text-[#e4e6eb] border-[#3e4042]';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

const getReasonBadgeClasses = (reason, isDark) => {
  const r = String(reason || "").trim().toLowerCase();

  if (r.includes("bad password")) {
    if (isDark) return 'bg-red-950/40 text-red-400 border-red-800/50';
    return 'bg-red-50 text-red-700 border-red-200';
  }

  if (isDark) return 'bg-[#2a2a2f] text-[#b0b3b8] border-[#3e4042]';
  return 'bg-gray-50 text-gray-500 border-gray-200';
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

  // -------------------------------------------------------
  // Tab state — Audit Log / Security Events. Phase 3g: presented as an
  // in-page tab on the existing "Audit Trail" screen rather than a new
  // top-level nav item, matching the app's flat-nav convention (no
  // tab-based sub-navigation exists elsewhere) and the plan's intent for
  // this to read as "a small, quiet list, not a dashboard."
  // -------------------------------------------------------
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'security'

  // ── Audit Log state ──────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [currentPage, setCurrentPage]   = useState(1);
  const [logs, setLogs]                 = useState([]);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");

  const [roleOptions, setRoleOptions]     = useState(["All"]);
  const [actionOptions, setActionOptions] = useState(["All"]);

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);

  const roleDropdownRef = useRef(null);
  const actionDropdownRef = useRef(null);

  // ── Security Events state (Phase 3) ──────────────────────────────────
  const [seSearch, setSeSearch]             = useState("");
  const [seEventTypeFilter, setSeEventTypeFilter] = useState("All");
  const [seReasonFilter, setSeReasonFilter] = useState("All");
  const [seCurrentPage, setSeCurrentPage]   = useState(1);
  const [seEvents, setSeEvents]             = useState([]);
  const [seTotalPages, setSeTotalPages]     = useState(1);
  const [seLoading, setSeLoading]           = useState(false);

  const [seEventTypeOptions, setSeEventTypeOptions] = useState(["All"]);
  const [seReasonOptions, setSeReasonOptions]       = useState(["All"]);

  const [seEventTypeDropdownOpen, setSeEventTypeDropdownOpen] = useState(false);
  const [seReasonDropdownOpen, setSeReasonDropdownOpen] = useState(false);

  const seEventTypeDropdownRef = useRef(null);
  const seReasonDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setRoleDropdownOpen(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setActionDropdownOpen(false);
      }
      if (seEventTypeDropdownRef.current && !seEventTypeDropdownRef.current.contains(event.target)) {
        setSeEventTypeDropdownOpen(false);
      }
      if (seReasonDropdownRef.current && !seReasonDropdownRef.current.contains(event.target)) {
        setSeReasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -------------------------------------------------------
  // Load Audit Log filter dropdown options once on mount
  // -------------------------------------------------------
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await getAuditLogFilters();
        setRoleOptions(["All", ...res.data.roles]);
        setActionOptions(["All", ...res.data.actions]);
      } catch (err) {
        setErrorMsg("Failed to load filter options.");
      }
    };
    loadFilters();
  }, []);

  // -------------------------------------------------------
  // Load Security Events filter dropdown options once on mount
  // -------------------------------------------------------
  useEffect(() => {
    const loadSeFilters = async () => {
      try {
        const res = await getSecurityEventFilters();
        setSeEventTypeOptions(["All", ...res.data.event_types]);
        setSeReasonOptions(["All", ...res.data.reasons]);
      } catch (err) {
        setErrorMsg("Failed to load security event filter options.");
      }
    };
    loadSeFilters();
  }, []);

  // -------------------------------------------------------
  // Fetch audit logs whenever filters or page changes
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
    if (activeTab === 'audit') fetchLogs();
  }, [fetchLogs, activeTab]);

  // -------------------------------------------------------
  // Fetch security events whenever filters or page changes
  // -------------------------------------------------------
  const fetchSecurityEvents = useCallback(async () => {
    setSeLoading(true);
    try {
      const res = await getSecurityEvents({
        search:     seSearch || undefined,
        event_type: seEventTypeFilter !== "All" ? seEventTypeFilter : undefined,
        reason:     seReasonFilter    !== "All" ? seReasonFilter    : undefined,
        page:       seCurrentPage,
        per_page:   PER_PAGE,
      });
      setSeEvents(res.data.data);
      setSeTotalPages(res.data.meta.last_page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load security events.");
    } finally {
      setSeLoading(false);
    }
  }, [seSearch, seEventTypeFilter, seReasonFilter, seCurrentPage]);

  useEffect(() => {
    if (activeTab === 'security') fetchSecurityEvents();
  }, [fetchSecurityEvents, activeTab]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => setCurrentPage(1);
  const handleSeFilterChange = () => setSeCurrentPage(1);

  const pageNumbers = (total, current) => {
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (current > 4) pages.push("...");
    if (current > 3 && current < total - 2) pages.push(current);
    pages.push("...", total - 1, total);
    return [...new Set(pages)];
  };

  const tabButtonClasses = (tab) => {
    const isActive = activeTab === tab;
    if (isActive) {
      return isDark
        ? 'bg-[#8B0000]/20 text-[#ffb3b3] border-[#8B0000]/30'
        : 'bg-[#8B0000]/10 text-[#8B0000] border-[#8B0000]/20';
    }
    return isDark
      ? 'bg-transparent text-[#b0b3b8] border-transparent hover:bg-[#2a2a2f]'
      : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50';
  };

  return (
    <div className="w-full flex flex-col font-sans">
      <div className={`rounded-2xl p-4 sm:p-6 ${
        isDark 
          ? 'bg-[#242526] text-[#e4e6eb] border border-[#3e4042]' 
          : 'bg-white text-gray-900 shadow-md border border-gray-200/80'
      }`}>

        {/* Tab toggle */}
        <div className={`flex items-center gap-1 mb-4 p-1 rounded-xl w-fit ${isDark ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${tabButtonClasses('audit')}`}
          >
            Audit Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border flex items-center gap-1.5 ${tabButtonClasses('security')}`}
          >
            <ShieldExclamationIcon className="w-4 h-4" />
            Security Events
          </button>
        </div>

        {activeTab === 'audit' ? (
          <>
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
                          <div className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${isDark ? 'bg-[#3a3b3c]/50' : 'bg-gray-100'}`}>
                            <MagnifyingGlassIcon className={`w-8 h-8 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                          </div>
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
                {pageNumbers(totalPages, currentPage).map((p, i) => (
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
          </>
        ) : (
          <>
            {/* -------------------------------------------------------
                Security Events tab (Phase 3g) — deliberately a small,
                quiet list: same table shell as Audit Log for visual
                consistency, but no role badge, no eye-catching red —
                see getEventBadgeClasses/getReasonBadgeClasses above.
               ------------------------------------------------------- */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex-1 min-w-0 sm:max-w-xs">
                <VoiceSearchInput
                  value={seSearch}
                  onChange={(value) => {
                    setSeSearch(value);
                    handleSeFilterChange();
                  }}
                  placeholder="Search by email"
                />
              </div>

              {(seEventTypeFilter !== 'All' || seReasonFilter !== 'All' || seSearch.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setSeEventTypeFilter('All');
                    setSeReasonFilter('All');
                    setSeSearch('');
                    setSeCurrentPage(1);
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
            </div>

            <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#242526] border border-[#3e4042] shadow-none' : 'bg-white shadow-sm border border-gray-100'}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-sm">
                <thead>
                  <tr className={isDark ? 'border-b border-[#3e4042]' : 'border-b border-gray-100'}>
                    <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Timestamp</th>
                    <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Email</th>
                    <th className="px-4 py-3 text-center">
                      <DashboardDropdown
                        isOpen={seEventTypeDropdownOpen}
                        setIsOpen={setSeEventTypeDropdownOpen}
                        dropdownRef={seEventTypeDropdownRef}
                        align="center"
                        trigger={
                          <span className={seEventTypeFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                            Event Type
                          </span>
                        }
                        sections={[
                          {
                            title: 'Filter by Event Type',
                            items: seEventTypeOptions.map(option => ({
                              label: formatLabel(option),
                              isSelected: seEventTypeFilter === option,
                              onClick: () => {
                                setSeEventTypeFilter(option);
                                handleSeFilterChange();
                              }
                            }))
                          }
                        ]}
                      />
                    </th>
                    <th className="px-4 py-3 text-center">
                      <DashboardDropdown
                        isOpen={seReasonDropdownOpen}
                        setIsOpen={setSeReasonDropdownOpen}
                        dropdownRef={seReasonDropdownRef}
                        align="center"
                        trigger={
                          <span className={seReasonFilter !== 'All' ? (isDark ? 'text-yellow-400' : 'text-[#8b0000]') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
                            Reason
                          </span>
                        }
                        sections={[
                          {
                            title: 'Filter by Reason',
                            items: seReasonOptions.map(option => ({
                              label: formatLabel(option),
                              isSelected: seReasonFilter === option,
                              onClick: () => {
                                setSeReasonFilter(option);
                                handleSeFilterChange();
                              }
                            }))
                          }
                        ]}
                      />
                    </th>
                    <th className={`px-4 py-3 text-center font-medium ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {seLoading ? (
                    <ReportTableSkeleton isDark={isDark} count={10} />
                  ) : seEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20">
                        <div className="flex flex-col items-center justify-center">
                          <div className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${isDark ? 'bg-[#3a3b3c]/50' : 'bg-gray-100'}`}>
                            <ShieldExclamationIcon className={`w-8 h-8 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                          </div>
                          <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                            No Security Events Found
                          </h3>
                          <p className={`text-xs ${isDark ? 'text-[#9a9a9a]' : 'text-gray-500'}`}>
                            No failed local-auth or IDP-unreachable events match your current search or filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    seEvents.map((ev) => (
                      <tr key={ev.id} className={`border-b text-center transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#2a2a2f]' : 'border-gray-50 hover:bg-gray-50'}`}>

                        <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                          {ev.date} {ev.time}
                        </td>

                        <td className={`px-4 py-3 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>{ev.email}</td>

                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getEventBadgeClasses(ev.event_type, isDark)}`}>
                            {ev.event_type}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {ev.reason ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getReasonBadgeClasses(ev.reason, isDark)}`}>
                              {ev.reason}
                            </span>
                          ) : (
                            <span className={`text-xs ${isDark ? 'text-[#6b6b6b]' : 'text-gray-400'}`}>—</span>
                          )}
                        </td>

                        <td className={`px-4 py-3 text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>{ev.ip_address ?? "—"}</td>

                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className={`flex items-center justify-center gap-1 px-4 py-4 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
                <button onClick={() => setSeCurrentPage((p) => Math.max(1, p - 1))} disabled={seCurrentPage === 1}
                  className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                  <ChevronLeftIcon className="w-4 h-4" /> Previous
                </button>
                {pageNumbers(seTotalPages, seCurrentPage).map((p, i) => (
                  <button key={i} onClick={() => typeof p === "number" && setSeCurrentPage(p)} disabled={p === "..."}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                      ${seCurrentPage === p ? 'bg-yellow-400 text-white' : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-100')}
                      ${p === "..." ? "cursor-default pointer-events-none" : ""}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setSeCurrentPage((p) => Math.min(seTotalPages, p + 1))} disabled={seCurrentPage === seTotalPages}
                  className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                  Next <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

      <ErrorToast 
        message={errorMsg} 
        onClose={() => setErrorMsg("")} 
      />
      </div>
    </div>
  );
};

export default ReportManagement;