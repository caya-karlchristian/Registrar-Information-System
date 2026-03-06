import { useState } from "react";
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import DropDown from '../components/DropDown';
import ConfirmationModal from '../components/ConfirmationModal';

const ROLE_FILTERS   = ["All", "Student", "Alumni", "Admin", "Super Admin"];
const ACTION_FILTERS = ["All", "login", "logout", "admin_created", "admin_updated", "admin_deleted",'request_status_changed', 'role_assigned', 'role_removed'];
const PER_PAGE = 10;

const MOCK_LOGS = [
  { id: 1,  created_at: "2026-03-06 17:55:18", email: "juan.delacruz@pup.edu.ph",   role_name: "Student",    action: "login",         browser: "Chrome 122 / Windows"  },
  { id: 2,  created_at: "2026-03-06 17:58:42", email: "maria.santos@pup.edu.ph",    role_name: "Admin",      action: "admin_created", browser: "Firefox 124 / macOS"   },
  { id: 3,  created_at: "2026-03-06 18:01:05", email: "pedro.reyes@pup.edu.ph",     role_name: "Student",    action: "login",         browser: "Chrome 122 / Android"  },
  { id: 4,  created_at: "2026-03-06 18:05:33", email: "ana.gomez@pup.edu.ph",       role_name: "Alumni",     action: "admin_updated", browser: "Safari 17 / iOS"       },
  { id: 5,  created_at: "2026-03-06 18:10:17", email: "carlos.bautista@pup.edu.ph", role_name: "Student",    action: "logout",        browser: "Edge 122 / Windows"    },
  { id: 6,  created_at: "2026-03-06 18:15:09", email: "lisa.miranda@pup.edu.ph",    role_name: "Admin",      action: "admin_deleted", browser: "Chrome 122 / Linux"    },
  { id: 7,  created_at: "2026-03-06 18:20:44", email: "jose.cruz@pup.edu.ph",       role_name: "Admin",      action: "admin_updated", browser: "Firefox 124 / Windows" },
  { id: 8,  created_at: "2026-03-06 18:25:58", email: "nina.flores@pup.edu.ph",     role_name: "Super Admin",action: "admin_created", browser: "Chrome 122 / macOS"    },
  { id: 9,  created_at: "2026-03-06 18:30:21", email: "mark.santos@pup.edu.ph",     role_name: "Student",    action: "login",         browser: "Safari 17 / macOS"     },
  { id: 10, created_at: "2026-03-06 18:35:12", email: "grace.tan@pup.edu.ph",       role_name: "Alumni",     action: "admin_updated", browser: "Edge 122 / Windows"    },
];

const ReportManagement = () => {
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [currentPage, setCurrentPage]   = useState(1);
  const [logs, setLogs]                 = useState(MOCK_LOGS);
  const [showConfirm, setShowConfirm]   = useState(false);

  const handleFilterChange = () => setCurrentPage(1);

  const handleClearLogs = () => {
    setLogs([]);
    setSearch("");
    setRoleFilter("All");
    setActionFilter("All");
    setCurrentPage(1);
  };

  const filtered = logs
    .filter((log) => {
      const matchSearch =
        log.email.toLowerCase().includes(search.toLowerCase())  ||
        log.browser?.toLowerCase().includes(search.toLowerCase());
      const matchRole   = roleFilter   === "All" || log.role_name === roleFilter;
      const matchAction = actionFilter === "All" || log.action    === actionFilter;
      return matchSearch && matchRole && matchAction;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageNumbers = () => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1, 2, 3];
    if (safePage > 4) pages.push("...");
    if (safePage > 3 && safePage < totalPages - 2) pages.push(safePage);
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
            placeholder="Search "
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="outline-none bg-transparent text-sm text-gray-700 w-full placeholder-gray-400"
          />
        </div>

        <div className="w-40 mt-6">
          <DropDown label="Role" name="roleFilter"
            value={roleFilter === "All" ? "" : roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value || "All"); handleFilterChange(); }}
            options={ROLE_FILTERS} labelColor="text-gray-700"
          />
        </div>

        <div className="w-44 mt-6">
          <DropDown label="Action" name="actionFilter"
            value={actionFilter === "All" ? "" : actionFilter}
            onChange={(e) => { setActionFilter(e.target.value || "All"); handleFilterChange(); }}
            options={ACTION_FILTERS} labelColor="text-gray-700"
          />
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          className="mt-12 ml-65 px-5 py-2 rounded-full text-sm font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 shadow-sm transition-all"
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
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                  No logs found.
                </td>
              </tr>
            ) : (
              paginated.map((log) => (
                <tr key={log.id} className="border-b text-center border-gray-50 hover:bg-gray-50 transition-colors">

                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {log.created_at}
                  </td>

                  <td className="px-4 py-3 text-gray-800">{log.email}</td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-pup-dark-maroon">
                      {log.role_name}
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
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2 py-1 disabled:opacity-40">
            <ChevronLeftIcon className="w-4 h-4" /> Previous
          </button>
          {pageNumbers().map((p, i) => (
            <button key={i} onClick={() => typeof p === "number" && setCurrentPage(p)} disabled={p === "..."}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
                ${safePage === p ? "bg-yellow-400 text-white" : "text-gray-500 hover:bg-gray-100"}
                ${p === "..." ? "cursor-default pointer-events-none" : ""}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
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

    </div>
  );
};

export default ReportManagement;