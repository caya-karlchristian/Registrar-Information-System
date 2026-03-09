import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import ConfirmationModal from '../components/ConfirmationModal';
import { getAuditLogs, getAuditLogFilters } from "../services/api";
import ErrorToast from "../components/ErrorToast";

const PER_PAGE = 10;

const ReportManagement = () => {
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
  const handleClearLogs = () => {
    setLogs([]);
    setSearch("");
    setRoleFilter("All");
    setActionFilter("All");
    setCurrentPage(1);
    setShowConfirm(false);
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
    <div className="bg-[#F5F5F5] -mt-10 min-h-screen font-sans">

      <div className="flex flex-wrap items-center gap-3 mb-6">

        <div className="flex items-center gap-2 mt-12 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="outline-none bg-transparent text-sm text-gray-700 w-full placeholder-gray-400"
          />
        </div>

        <div className="w-40 mt-6">
          <DropDown label="Role" name="roleFilter"
            value={roleFilter === "All" ? "" : roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value || "All"); handleFilterChange(); }}
            options={roleOptions} labelColor="text-gray-700"
          />
        </div>

        <div className="w-44 mt-6">
          <DropDown label="Action" name="actionFilter"
            value={actionFilter === "All" ? "" : actionFilter}
            onChange={(e) => { setActionFilter(e.target.value || "All"); handleFilterChange(); }}
            options={actionOptions} labelColor="text-gray-700"
          />
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          className="mt-12 px-5 py-2 rounded-full text-sm font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 shadow-sm transition-all"
        >
          Clear Logs
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Timestamp", "User", "Role", "Action", "Browser"].map((h) => (
                <th key={h} className="px-4 py-3 text-center text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                  No logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b text-center border-gray-50 hover:bg-gray-50 transition-colors">

                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {log.date} {log.time}
                  </td>

                  <td className="px-4 py-3 text-gray-800">{log.user}</td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-pup-dark-maroon">
                      {log.role}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                      {log.action}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-500 text-xs">{log.browser ?? "—"}</td>

                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-1 px-4 py-4 border-t border-gray-100">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40">
            <ChevronLeftIcon className="w-4 h-4" /> Previous
          </button>
          {pageNumbers().map((p, i) => (
            <button key={i} onClick={() => typeof p === "number" && setCurrentPage(p)} disabled={p === "..."}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                ${currentPage === p ? "bg-yellow-400 text-white" : "text-gray-500 hover:bg-gray-100"}
                ${p === "..." ? "cursor-default pointer-events-none" : ""}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40">
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