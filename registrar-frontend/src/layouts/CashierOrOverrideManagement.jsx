import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import DashboardDropdown from "../components/DashboardDropdown.jsx";
import ConfirmationModal from "../components/ConfirmationModal.jsx";
import {
  CashierOverrideDetailsModal,
  CreateCashierOverrideModal,
} from "../components/CashierOrOverrideModals.jsx";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import {
  getCashierOverrides,
  revokeCashierOverride,
} from "../services/api";

/**
 * Admin screen for the cashier OR override safety valve (see
 * CashierOrOverrideController on the backend for the full design
 * rationale). An admin pre-clears one specific (OR number, student)
 * pair with a required written reason, so a real receipt the Cashier
 * API happens to reject never forces blanking CASHIER_API_KEY
 * system-wide. Every create/revoke is audit-logged on the backend;
 * this screen just surfaces that flow.
 *
 * Gated by the "cashier_overrides" module — reached via
 * <ModuleRoute module={MODULE_KEYS.CASHIER_OVERRIDES}> under /staff,
 * and unconditionally under /super-admin (super admin bypasses the
 * module check entirely, same pattern as Business Calendar).
 */
const CashierOrOverrideManagement = () => {
  const { isDark } = useTheme();

  const [showHistory, setShowHistory] = useState(false);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [, setActionLoading] = useState(false);
  const [, setMeta] = useState({ current_page: 1, last_page: 1 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null); // override row, or null
  const [revokeConfirm, setRevokeConfirm] = useState({ open: false, item: null });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadOverrides = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await getCashierOverrides({
        active: showHistory ? 0 : 1,
        page,
      });
      setOverrides(res.data?.data ?? []);
      setMeta({
        current_page: res.data?.current_page ?? 1,
        last_page: res.data?.last_page ?? 1,
      });
    } catch (err) {
      console.error("Failed to load cashier OR overrides:", err);
      setErrorMsg("Couldn't load cashier OR overrides. Please try again.");
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  }, [showHistory]);

  useEffect(() => {
    loadOverrides(1);
  }, [loadOverrides]);

  const handleCreated = (newOverride) => {
    if (newOverride) {
      setOverrides((prev) => [newOverride, ...prev]);
    } else {
      loadOverrides(1);
    }
    setSuccessMsg("Cashier OR override created successfully.");
  };

  const handleRevokeConfirm = async () => {
    const { item } = revokeConfirm;
    if (!item) return;
    try {
      setActionLoading(true);
      await revokeCashierOverride(item.override_id);
      setOverrides((prev) =>
        showHistory
          ? prev.map((o) => (o.override_id === item.override_id ? { ...o, revoked_at: new Date().toISOString() } : o))
          : prev.filter((o) => o.override_id !== item.override_id)
      );
      setSuccessMsg(`Override for OR #${item.or_number} revoked.`);
      setRevokeConfirm({ open: false, item: null });
    } catch (err) {
      console.error("Failed to revoke cashier OR override:", err);
      setErrorMsg(err?.response?.data?.message || "Couldn't revoke this override. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const cardClasses = isDark ? "bg-[#18191a] text-[#e4e6eb]" : "bg-white text-gray-900";
  const rowBorder = isDark ? "border-[#3e4042]" : "border-gray-200";
  const subtleText = isDark ? "text-[#b0b3b8]" : "text-gray-500";
  const activeTabClasses = isDark ? "bg-yellow-400 text-gray-900" : "bg-pup-dark-maroon text-white";

  const statusOf = (o) => {
    if (o.revoked_at) return { label: "Revoked", tone: "gray" };
    if (o.used_at) return { label: "Used", tone: "blue" };
    return { label: "Active", tone: "green" };
  };

  const badgeClasses = (tone) => {
    const map = {
      green: isDark ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-700",
      blue: isDark ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700",
      gray: isDark ? "bg-[#3a3b3c] text-[#b0b3b8]" : "bg-gray-100 text-gray-600",
    };
    return `text-xs font-semibold px-2.5 py-1 rounded-full ${map[tone]}`;
  };

  const studentLabel = (o) => {
    if (!o.user) return `User #${o.user_id}`;
    return o.user.email;
  };

  const STATUS_FILTERS = ["All", "Active", "Used", "Revoked"];

  const handleFilterChange = () => setCurrentPage(1);

  const filtered = React.useMemo(() => {
    return overrides
      .filter((o) => {
        const st = statusOf(o).label;
        const matchesTab = showHistory
          ? (st === "Used" || st === "Revoked")
          : (st === "Active");
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          String(o.or_number || "").toLowerCase().includes(query) ||
          String(o.user?.email || "").toLowerCase().includes(query) ||
          String(o.created_by_user?.email || "").toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || st === statusFilter;
        return matchesTab && matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortField === "or_number") {
          const valA = String(a.or_number || "");
          const valB = String(b.or_number || "");
          return sortOrder === "asc"
            ? valA.localeCompare(valB, undefined, { numeric: true })
            : valB.localeCompare(valA, undefined, { numeric: true });
        } else {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        }
      });
  }, [overrides, search, statusFilter, sortField, sortOrder, showHistory]);

  const PER_PAGE = 7;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div className={`font-sans rounded-2xl p-4 sm:px-6 ${cardClasses}`}>
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-5 mb-2">
        <div>
          <h2 className="text-lg font-bold">Cashier OR Overrides</h2>
          <p className={`text-xs mt-1 max-w-xl ${subtleText}`}>
            A scoped, audited bypass for one OR number + student/alumni pair — use this when a real receipt
            keeps getting rejected by the Cashier API. It never disables verification for anyone else.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className={`inline-flex rounded-full p-1 ${isDark ? "bg-[#242526] border border-[#3e4042]" : "bg-gray-100 border border-gray-200"}`}>
            <button
              onClick={() => { setShowHistory(false); handleFilterChange(); }}
              className={`text-sm font-semibold px-4 py-2 rounded-full transition-all cursor-pointer ${
                !showHistory ? activeTabClasses : subtleText
              }`}
            >
              Active
            </button>
            <button
              onClick={() => { setShowHistory(true); handleFilterChange(); }}
              className={`text-sm font-semibold px-4 py-2 rounded-full transition-all cursor-pointer ${
                showHistory ? activeTabClasses : subtleText
              }`}
            >
              History
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className={`text-sm font-bold px-4 py-2.5 rounded-full transition-all cursor-pointer shadow ${
              isDark
                ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                : "bg-pup-dark-maroon text-white hover:bg-[#3a0303]"
            }`}
          >
            + New override
          </button>
        </div>
      </div>

      <div className={`rounded-xl border ${rowBorder}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b rounded-t-xl ${isDark ? 'border-[#3e4042] bg-[#1a1a1c]/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className="w-full sm:max-w-md">
            <VoiceSearchInput
              value={search}
              onChange={(val) => { setSearch(val); handleFilterChange(); }}
              placeholder="Search by OR number or email"
            />
          </div>
          <div className="flex items-center justify-end gap-3 ml-auto">
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {safePage} of {totalPages}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin min-h-85">
          <table className="w-full min-w-162.5 text-sm">
          <thead>
            <tr className={`text-center ${isDark ? "bg-[#242526]" : "bg-gray-50 border-b border-gray-100"}`}>
              {/* OR Number Header (Sortable) */}
              <th className="px-4 py-3 text-center font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === "or_number") {
                      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
                    } else {
                      setSortField("or_number");
                      setSortOrder("asc");
                    }
                    handleFilterChange();
                  }}
                  className={`flex items-center justify-center gap-1 mx-auto text-xs uppercase font-bold hover:text-[#800000] dark:hover:text-[#FFC72C] transition-colors focus:outline-none cursor-pointer ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}
                >
                  <span>OR number</span>
                  {sortField === "or_number" ? (
                    sortOrder === "asc" ? <ChevronUpIcon className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 opacity-50" />
                  )}
                </button>
              </th>

              <th className={`px-4 py-3 text-center font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Student</th>
              <th className={`px-4 py-3 text-center font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Created by</th>

              {/* Status Header with Column Dropdown Filter */}
              <th className="px-4 py-3 text-center font-semibold">
                <DashboardDropdown
                  isOpen={statusDropdownOpen}
                  setIsOpen={setStatusDropdownOpen}
                  dropdownRef={statusDropdownRef}
                  align="center"
                  trigger={
                    <span className={statusFilter !== 'All' ? (isDark ? 'text-yellow-400 font-bold' : 'text-[#8b0000] font-bold') : (isDark ? 'text-[#b0b3b8]' : 'text-gray-500')}>
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
                          handleFilterChange();
                        }
                      }))
                    }
                  ]}
                />
              </th>

              {/* Created Header (Sortable) */}
              <th className="px-4 py-3 text-center font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === "created_at") {
                      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
                    } else {
                      setSortField("created_at");
                      setSortOrder("desc");
                    }
                    handleFilterChange();
                  }}
                  className={`flex items-center justify-center gap-1 mx-auto text-xs uppercase font-bold hover:text-[#800000] dark:hover:text-[#FFC72C] transition-colors focus:outline-none cursor-pointer ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}
                >
                  <span>Created</span>
                  {sortField === "created_at" ? (
                    sortOrder === "asc" ? <ChevronUpIcon className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-blue-500" />
                  ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 opacity-50" />
                  )}
                </button>
              </th>

              <th className={`px-4 py-3 text-center font-semibold ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={`px-4 py-8 text-center ${subtleText}`}>
                  Loading…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className={`px-4 py-8 text-center ${subtleText}`}>
                  {showHistory ? "No overrides found." : "No active overrides matching your filters."}
                </td>
              </tr>
            ) : (
              paginated.map((o) => {
                const status = statusOf(o);
                const isActive = !o.used_at && !o.revoked_at;
                return (
                  <tr key={o.override_id} className={`border-t text-center transition-colors ${isDark ? 'border-[#3e4042] hover:bg-[#2a2a2f]' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium">{o.or_number}</td>
                    <td className="px-4 py-3">{studentLabel(o)}</td>
                    <td className={`px-4 py-3 ${subtleText}`}>
                      {o.created_by_user?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={badgeClasses(status.tone)}>{status.label}</span>
                    </td>
                    <td className={`px-4 py-3 ${subtleText}`}>
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setDetailsItem(o)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isDark ? "border-[#3e4042] text-[#b0b3b8] hover:bg-[#242526]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Details
                      </button>
                      {isActive && (
                        <button
                          onClick={() => setRevokeConfirm({ open: true, item: o })}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer bg-red-600 text-white hover:bg-red-700"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination Controls */}
        <div className={`flex items-center justify-center gap-1 px-4 py-4 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 cursor-pointer ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                safePage === p
                  ? (isDark ? 'bg-yellow-400 text-gray-900 font-bold' : 'bg-pup-dark-maroon text-white font-bold')
                  : (isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-500 hover:bg-gray-100')
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className={`flex items-center gap-1 text-sm px-2 py-1 disabled:opacity-40 cursor-pointer ${isDark ? 'text-[#b0b3b8] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Next
          </button>
        </div>
      </div>

      {createModalOpen && (
        <CreateCashierOverrideModal
          isDark={isDark}
          subtleText={subtleText}
          onClose={() => setCreateModalOpen(false)}
          onCreated={handleCreated}
          onError={(msg) => setErrorMsg(msg)}
        />
      )}

      {detailsItem && (
        <CashierOverrideDetailsModal
          item={detailsItem}
          isDark={isDark}
          rowBorder={rowBorder}
          subtleText={subtleText}
          statusOf={statusOf}
          badgeClasses={badgeClasses}
          onClose={() => setDetailsItem(null)}
        />
      )}

      {/* Revoke confirmation modal using system ConfirmationModal */}
      <ConfirmationModal
        isOpen={revokeConfirm.open}
        onClose={() => setRevokeConfirm({ open: false, item: null })}
        onConfirm={handleRevokeConfirm}
        title="Revoke Override?"
        message={`OR #${revokeConfirm.item?.or_number} will no longer bypass Cashier API verification. The student will need a new override, or the OR to verify normally, to submit their request.`}
        type="danger"
        confirmText="Revoke"
      />

      <SuccessToast message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
    </div>
  );
};

export default CashierOrOverrideManagement;