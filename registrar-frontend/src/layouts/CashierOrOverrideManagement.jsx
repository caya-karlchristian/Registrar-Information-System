import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import DashboardDropdown from "../components/DashboardDropdown.jsx";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import {
  getCashierOverrides,
  createCashierOverride,
  revokeCashierOverride,
  searchCashierOverrideUsers,
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
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleCreated = (override) => {
    setCreateModalOpen(false);
    setSuccessMsg(`Override created for OR #${override.or_number} — the student can now submit normally.`);
    if (!showHistory) {
      loadOverrides(1);
    }
  };

  const handleRevokeConfirm = async () => {
    const { item } = revokeConfirm;
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
  const accentBtn = isDark
    ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
    : "bg-pup-dark-maroon text-white hover:bg-pup-maroon";
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
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          String(o.or_number || "").toLowerCase().includes(query) ||
          String(o.user?.email || "").toLowerCase().includes(query) ||
          String(o.created_by_user?.email || "").toLowerCase().includes(query);
        const matchesStatus = statusFilter === "All" || st === statusFilter;
        return matchesSearch && matchesStatus;
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
  }, [overrides, search, statusFilter, sortField, sortOrder]);

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
            A scoped, audited bypass for one OR number + student pair — use this when a real receipt
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

      {/* Table & Search Header */}
      <div className={`rounded-xl border overflow-hidden ${rowBorder}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b ${isDark ? 'border-[#3e4042] bg-[#1a1a1c]/20' : 'border-gray-200 bg-gray-50/50'}`}>
          <div className="w-full sm:max-w-md">
            <VoiceSearchInput
              value={search}
              onChange={(val) => { setSearch(val); handleFilterChange(); }}
              placeholder="Search by OR number or student email"
            />
          </div>
          <div className="flex items-center justify-end gap-3 ml-auto">
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {safePage} of {totalPages}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[650px] text-sm">
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
        <CreateOverrideModal
          isDark={isDark}
          rowBorder={rowBorder}
          subtleText={subtleText}
          accentBtn={accentBtn}
          onClose={() => setCreateModalOpen(false)}
          onCreated={handleCreated}
          onError={(msg) => setErrorMsg(msg)}
        />
      )}

      {detailsItem && (
        <DetailsModal
          item={detailsItem}
          isDark={isDark}
          rowBorder={rowBorder}
          subtleText={subtleText}
          statusOf={statusOf}
          badgeClasses={badgeClasses}
          onClose={() => setDetailsItem(null)}
        />
      )}

      {/* Revoke confirmation */}
      {revokeConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-[2px] bg-black/50">
          <div className={`rounded-xl shadow-xl w-full max-w-sm p-6 ${isDark ? "bg-[#242526] border border-[#3e4042] text-[#e4e6eb]" : "bg-white border border-gray-100 text-gray-900"}`}>
            <h3 className="text-lg font-bold mb-2">Revoke this override?</h3>
            <p className={`text-sm mb-6 ${subtleText}`}>
              OR <strong>#{revokeConfirm.item?.or_number}</strong> will no longer bypass Cashier API
              verification. The student will need a new override, or the OR to actually verify normally,
              to submit their request.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRevokeConfirm({ open: false, item: null })}
                disabled={actionLoading}
                className={`text-sm font-semibold px-4 py-2 rounded-lg border cursor-pointer disabled:opacity-50 ${rowBorder}`}
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeConfirm}
                disabled={actionLoading}
                className="text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 bg-red-600 text-white hover:bg-red-700"
              >
                {actionLoading ? "Revoking..." : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessToast message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
    </div>
  );
};

/**
 * Read-only detail view — reason and verified_items are the actual
 * justification an admin gave for bypassing a money-facing check, so
 * this screen is where a second reviewer (or the same admin later)
 * would go to see exactly what was recorded, without needing to join
 * into the audit log directly.
 */
const DetailsModal = ({ item, isDark, rowBorder, subtleText, statusOf, badgeClasses, onClose }) => {
  const status = statusOf(item);
  const items = Array.isArray(item.verified_items) ? item.verified_items : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-[2px] bg-black/50">
      <div className={`rounded-xl shadow-xl w-full max-w-lg p-6 ${isDark ? "bg-[#242526] border border-[#3e4042] text-[#e4e6eb]" : "bg-white border border-gray-100 text-gray-900"}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">OR #{item.or_number}</h3>
            <p className={`text-xs mt-0.5 ${subtleText}`}>{item.user?.email ?? `User #${item.user_id}`}</p>
          </div>
          <span className={badgeClasses(status.tone)}>{status.label}</span>
        </div>

        <div className={`text-sm mb-4 p-3 rounded-lg ${isDark ? "bg-[#1a1b1e]" : "bg-gray-50"}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${subtleText}`}>Reason</div>
          <p className="whitespace-pre-wrap">{item.reason}</p>
        </div>

        {items.length > 0 && (
          <div className="mb-4">
            <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${subtleText}`}>
              Verified Items (as read off the physical receipt)
            </div>
            <div className={`rounded-lg border overflow-hidden ${rowBorder}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? "bg-[#1a1b1e]" : "bg-gray-50"}>
                    <th className="px-3 py-2 text-left font-semibold">Document</th>
                    <th className="px-3 py-2 text-left font-semibold">Qty</th>
                    <th className="px-3 py-2 text-left font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className={`border-t ${rowBorder}`}>
                      <td className="px-3 py-2">{it.document}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{it.amount || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <dl className={`grid grid-cols-2 gap-y-2 text-xs ${subtleText} mb-6`}>
          <dt>Created by</dt>
          <dd className="text-right">
            {item.created_by_user?.email ?? "—"}
          </dd>
          <dt>Created at</dt>
          <dd className="text-right">{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</dd>
          {item.used_at && (
            <>
              <dt>Used at</dt>
              <dd className="text-right">{new Date(item.used_at).toLocaleString()}</dd>
            </>
          )}
          {item.revoked_at && (
            <>
              <dt>Revoked by</dt>
              <dd className="text-right">{item.revoked_by_user?.email ?? "—"}</dd>
              <dt>Revoked at</dt>
              <dd className="text-right">{new Date(item.revoked_at).toLocaleString()}</dd>
            </>
          )}
        </dl>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`text-sm font-semibold px-4 py-2 rounded-lg border cursor-pointer ${rowBorder}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Create-override form. The student picker is a debounced typeahead
 * against /cashier-overrides/search-users rather than a free-typed
 * user_id — an admin at the counter has a name or a receipt, not a
 * database id.
 */
const CreateOverrideModal = ({ isDark, rowBorder, subtleText, accentBtn, onClose, onCreated, onError }) => {
  const [orNumber, setOrNumber] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState([]); // { document, quantity, amount }

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const debounceRef = useRef(null);

  useEffect(() => {
    if (selectedUser || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchCashierOverrideUsers(query.trim());
        setResults(res.data?.data ?? []);
        setShowResults(true);
      } catch (err) {
        console.error("Student search failed:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, selectedUser]);

  const pickUser = (u) => {
    setSelectedUser(u);
    setQuery(`${u.full_name} — ${u.email}`);
    setShowResults(false);
  };

  const clearUser = () => {
    setSelectedUser(null);
    setQuery("");
    setResults([]);
  };

  const addItemRow = () => setItems((prev) => [...prev, { document: "", quantity: 1, amount: "" }]);
  const removeItemRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItemRow = (idx, key, value) =>
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));

  const handleSubmit = async () => {
    setFieldErrors({});

    if (!selectedUser) {
      setFieldErrors({ user_id: "Search for and select the student first." });
      return;
    }
    if (!orNumber.trim()) {
      setFieldErrors({ or_number: "OR number is required." });
      return;
    }
    if (reason.trim().length < 10) {
      setFieldErrors({ reason: "Give a real reason (at least 10 characters) — this bypasses a money-facing check." });
      return;
    }

    const cleanedItems = items
      .filter((row) => row.document.trim() !== "")
      .map((row) => ({
        document: row.document.trim(),
        quantity: Number(row.quantity) || 1,
        amount: row.amount?.trim() || undefined,
      }));

    try {
      setSubmitting(true);
      const res = await createCashierOverride({
        or_number: orNumber.trim(),
        user_id: selectedUser.user_id,
        reason: reason.trim(),
        verified_items: cleanedItems.length > 0 ? cleanedItems : undefined,
      });
      onCreated(res.data);
    } catch (err) {
      console.error("Failed to create cashier OR override:", err);
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors) {
        setFieldErrors(
          Object.fromEntries(Object.entries(apiErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
        );
      } else {
        onError(err?.response?.data?.message || "Couldn't create this override. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses = `w-full p-2.5 rounded-lg border text-sm ${
    isDark ? "bg-[#1a1b1e] border-[#3e4042] text-white" : "bg-white border-gray-300 text-gray-900"
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 backdrop-blur-[2px] bg-black/50 overflow-y-auto">
      <div className={`rounded-xl shadow-xl w-full max-w-lg p-6 my-auto ${isDark ? "bg-[#242526] border border-[#3e4042] text-[#e4e6eb]" : "bg-white border border-gray-100 text-gray-900"}`}>
        <h3 className="text-lg font-bold mb-1">New Cashier OR Override</h3>
        <p className={`text-sm mb-5 ${subtleText}`}>
          Scoped to this one OR number and student only — every other request still goes through the
          normal Cashier API check.
        </p>

        <div className="space-y-4">
          {/* Student picker */}
          <div className="relative">
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block">Student</label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedUser(null);
                }}
                onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Search by name or email…"
                className={inputClasses}
              />
              {selectedUser && (
                <button
                  type="button"
                  onClick={clearUser}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs cursor-pointer ${subtleText}`}
                >
                  Change
                </button>
              )}
            </div>
            {showResults && !selectedUser && (
              <div className={`absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-52 overflow-y-auto ${isDark ? "bg-[#1a1b1e] border-[#3e4042]" : "bg-white border-gray-200"}`}>
                {searching ? (
                  <div className={`px-3 py-2.5 text-sm ${subtleText}`}>Searching…</div>
                ) : results.length === 0 ? (
                  <div className={`px-3 py-2.5 text-sm ${subtleText}`}>
                    {query.trim().length < 2 ? "Type at least 2 characters…" : "No matching student or alumni account."}
                  </div>
                ) : (
                  results.map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => pickUser(u)}
                      className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer ${isDark ? "hover:bg-[#242526]" : "hover:bg-gray-50"}`}
                    >
                      <div className="font-medium">{u.full_name}</div>
                      <div className={`text-xs ${subtleText}`}>{u.email} · {u.role_name}</div>
                    </button>
                  ))
                )}
              </div>
            )}
            {fieldErrors.user_id && <p className="text-xs text-red-500 mt-1">{fieldErrors.user_id}</p>}
          </div>

          {/* OR Number */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block">OR Number</label>
            <input
              type="text"
              value={orNumber}
              onChange={(e) => setOrNumber(e.target.value)}
              placeholder="e.g. 0234891"
              maxLength={50}
              className={inputClasses}
            />
            {fieldErrors.or_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.or_number}</p>}
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={`e.g. "Verified physical receipt at the counter — cashier system typo'd the middle name, OR itself is genuine."`}
              className={inputClasses}
            />
            <p className={`text-xs mt-1 ${subtleText}`}>{reason.trim().length}/10 characters minimum</p>
            {fieldErrors.reason && <p className="text-xs text-red-500 mt-1">{fieldErrors.reason}</p>}
          </div>

          {/* Verified items */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wide">
                Verified Items <span className={subtleText}>(optional, recommended)</span>
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className={`text-xs font-semibold cursor-pointer ${isDark ? "text-yellow-400" : "text-pup-dark-maroon"}`}
              >
                + Add item
              </button>
            </div>
            <p className={`text-xs mb-2 ${subtleText}`}>
              What you physically read off the receipt. Item/quantity matching still applies against these
              values — this only bypasses the OR-lookup, not the copy count check.
            </p>
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 items-start"
                    style={{ gridTemplateColumns: "1fr 72px 96px 24px" }}
                  >
                    <input
                      type="text"
                      value={row.document}
                      onChange={(e) => updateItemRow(idx, "document", e.target.value)}
                      placeholder="Document label"
                      className={inputClasses}
                      style={{ minWidth: 0, width: "100%" }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={row.quantity}
                      onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                      className={inputClasses}
                      style={{ minWidth: 0, width: "100%" }}
                    />
                    <input
                      type="text"
                      value={row.amount}
                      onChange={(e) => updateItemRow(idx, "amount", e.target.value)}
                      placeholder="Amount"
                      className={inputClasses}
                      style={{ minWidth: 0, width: "100%" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="text-red-500 text-sm cursor-pointer px-1 py-2"
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className={`text-sm font-semibold px-4 py-2 rounded-lg border cursor-pointer disabled:opacity-50 ${rowBorder}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 ${accentBtn}`}
          >
            {submitting ? "Creating..." : "Create Override"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashierOrOverrideManagement;