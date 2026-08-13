import React, { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import {
  getCalendarExceptions,
  createCalendarException,
  updateCalendarException,
  deleteCalendarException,
  getCalendarOverrides,
  createCalendarOverride,
  updateCalendarOverride,
  deleteCalendarOverride,
} from "../services/api";
import VoiceSearchInput from "../components/VoiceSearchInput.jsx";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import ConfirmationModal from "../components/ConfirmationModal.jsx";

const PER_PAGE = 10;

const EXCEPTION_TYPES = [
  { value: "holiday", label: "Holiday" },
  { value: "suspension", label: "Suspension" },
  { value: "event", label: "Event" },
];

const DAYS_OF_WEEK = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

const EMPTY_EXCEPTION_FORM = { type: "holiday", label: "", date: "", end_date: "" };
const EMPTY_OVERRIDE_FORM = { day_of_week: "monday", is_closed: true, label: "", effective_from: "", effective_until: "" };

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Admin/superadmin screen for the business calendar's two closure
 * mechanisms — see BusinessCalendarService's class docblock (backend) for
 * the full precedence rules this UI is managing data for:
 *
 *   1. Closures (business_calendar_holidays) — one-off dated closures:
 *      declared holidays, suspensions, or one-off events. Always wins,
 *      even over a recurring override on the same day.
 *   2. Recurring Overrides (business_calendar_overrides) — time-bound
 *      weekly rules like "closed every Monday, effective <date>, until
 *      further notice."
 *
 * Gated in routes/api.php by ['role:3,4', 'module:business_calendar'] —
 * an admin needs the "Business Calendar" module granted on their policy
 * (see PolicyManagement.jsx); super admin always has access.
 *
 * Self-contained like SignatoryManagement — owns its own fetch, toasts,
 * and modals rather than relying on ReferenceDataContext, since this data
 * doesn't need to be available app-wide the way signatories/document
 * types are.
 */
const BusinessCalendarManagement = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("exceptions"); // 'exceptions' | 'overrides'

  // ---- Closures (exceptions) state ----
  const [exceptions, setExceptions] = useState([]);
  const [exceptionsMeta, setExceptionsMeta] = useState({ current_page: 1, last_page: 1 });
  const [exceptionsPage, setExceptionsPage] = useState(1);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [includePast, setIncludePast] = useState(false);

  // ---- Recurring overrides state ----
  const [overrides, setOverrides] = useState([]);
  const [overridesMeta, setOverridesMeta] = useState({ current_page: 1, last_page: 1 });
  const [overridesPage, setOverridesPage] = useState(1);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);

  const [search, setSearch] = useState("");

  // ---- Shared form/modal state ----
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creating
  const [exceptionForm, setExceptionForm] = useState(EMPTY_EXCEPTION_FORM);
  const [overrideForm, setOverrideForm] = useState(EMPTY_OVERRIDE_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, record }

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // -------------------------------------------------------
  // Fetching
  // -------------------------------------------------------
  const fetchExceptions = useCallback(async (page = 1, includePastValue = includePast) => {
    setExceptionsLoading(true);
    try {
      const res = await getCalendarExceptions({
        page,
        per_page: PER_PAGE,
        include_past: includePastValue ? 1 : 0,
      });
      setExceptions(res.data.data);
      setExceptionsMeta({ current_page: res.data.current_page, last_page: res.data.last_page });
    } catch (err) {
      console.error("Failed to load calendar closures:", err);
      setErrorMsg("Couldn't load closures. Please try again.");
    } finally {
      setExceptionsLoading(false);
    }
  }, [includePast]);

  const fetchOverrides = useCallback(async (page = 1, includeExpiredValue = includeExpired) => {
    setOverridesLoading(true);
    try {
      const res = await getCalendarOverrides({
        page,
        per_page: PER_PAGE,
        include_expired: includeExpiredValue ? 1 : 0,
      });
      setOverrides(res.data.data);
      setOverridesMeta({ current_page: res.data.current_page, last_page: res.data.last_page });
    } catch (err) {
      console.error("Failed to load recurring overrides:", err);
      setErrorMsg("Couldn't load recurring overrides. Please try again.");
    } finally {
      setOverridesLoading(false);
    }
  }, [includeExpired]);

  useEffect(() => {
    fetchExceptions(exceptionsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exceptionsPage, includePast]);

  useEffect(() => {
    fetchOverrides(overridesPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overridesPage, includeExpired]);

  // -------------------------------------------------------
  // Form open/close
  // -------------------------------------------------------
  const openCreateForm = () => {
    setEditingId(null);
    setFieldErrors({});
    if (activeTab === "exceptions") {
      setExceptionForm(EMPTY_EXCEPTION_FORM);
    } else {
      setOverrideForm(EMPTY_OVERRIDE_FORM);
    }
    setIsFormOpen(true);
  };

  const openEditExceptionForm = (exception) => {
    setActiveTab("exceptions");
    setEditingId(exception.holiday_id);
    setExceptionForm({
      type: exception.type,
      label: exception.label,
      date: exception.date?.slice(0, 10) ?? "",
      end_date: exception.end_date?.slice(0, 10) ?? "",
    });
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const openEditOverrideForm = (override) => {
    setActiveTab("overrides");
    setEditingId(override.override_id);
    setOverrideForm({
      day_of_week: override.day_of_week,
      is_closed: !!override.is_closed,
      label: override.label,
      effective_from: override.effective_from?.slice(0, 10) ?? "",
      effective_until: override.effective_until?.slice(0, 10) ?? "",
    });
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return; // don't let the modal be dismissed mid-save
    setIsFormOpen(false);
  };

  // -------------------------------------------------------
  // Submit
  // -------------------------------------------------------
  const handleExceptionSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload = {
      type: exceptionForm.type,
      label: exceptionForm.label.trim(),
      date: exceptionForm.date,
      end_date: exceptionForm.end_date || null,
    };

    try {
      if (editingId) {
        await updateCalendarException(editingId, payload);
        setSuccessMsg("Closure updated successfully!");
      } else {
        await createCalendarException(payload);
        setSuccessMsg("Closure added successfully!");
      }
      await fetchExceptions(exceptionsPage);
      setIsFormOpen(false);
    } catch (err) {
      handleSubmitError(err, "closure");
    } finally {
      setSaving(false);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload = {
      day_of_week: overrideForm.day_of_week,
      is_closed: overrideForm.is_closed,
      label: overrideForm.label.trim(),
      effective_from: overrideForm.effective_from,
      effective_until: overrideForm.effective_until || null,
    };

    try {
      if (editingId) {
        await updateCalendarOverride(editingId, payload);
        setSuccessMsg("Recurring override updated successfully!");
      } else {
        await createCalendarOverride(payload);
        setSuccessMsg("Recurring override added successfully!");
      }
      await fetchOverrides(overridesPage);
      setIsFormOpen(false);
    } catch (err) {
      handleSubmitError(err, "recurring override");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitError = (err, resourceLabel) => {
    const status = err?.response?.status;
    if (status === 422) {
      setFieldErrors(err.response.data?.errors ?? {});
      setErrorMsg(err.response.data?.message || "Please fix the highlighted fields.");
    } else if (status === 403) {
      setErrorMsg("You don't have permission to manage the business calendar.");
    } else {
      setErrorMsg(`Couldn't save this ${resourceLabel}. Please try again.`);
    }
    console.error(`Failed to save ${resourceLabel}:`, err);
  };

  // -------------------------------------------------------
  // Delete
  // -------------------------------------------------------
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { kind, record } = deleteTarget;

    try {
      if (kind === "exception") {
        await deleteCalendarException(record.holiday_id);
        await fetchExceptions(exceptionsPage);
      } else {
        await deleteCalendarOverride(record.override_id);
        await fetchOverrides(overridesPage);
      }
      setSuccessMsg(kind === "exception" ? "Closure deleted." : "Recurring override deleted.");
    } catch (err) {
      console.error(`Failed to delete ${kind}:`, err);
      const status = err?.response?.status;
      setErrorMsg(
        status === 403
          ? "You don't have permission to manage the business calendar."
          : "Couldn't delete this entry. Please try again."
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  // -------------------------------------------------------
  // Client-side search over the currently loaded page
  // -------------------------------------------------------
  const filteredExceptions = exceptions.filter((item) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return [item.label, item.type, item.date, item.end_date].join(" ").toLowerCase().includes(query);
  });

  const filteredOverrides = overrides.filter((item) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return [item.label, item.day_of_week, item.effective_from, item.effective_until]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 ${
    isDark
      ? "bg-[#18191a] border-[#3e4042] text-[#e4e6eb] focus:ring-yellow-400/40 focus:border-yellow-400/60"
      : "bg-white border-gray-300 text-gray-900 focus:ring-pup-maroon/30 focus:border-pup-maroon"
  }`;

  const labelClass = `mb-1 block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`;

  const TYPE_BADGE = {
    holiday: isDark ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-700",
    suspension: isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700",
    event: isDark ? "bg-purple-900/30 text-purple-300" : "bg-purple-50 text-purple-700",
  };

  return (
    <main className={`min-h-screen p-4 sm:p-6 ${isDark ? "bg-[#18191a] text-[#e4e6eb]" : "text-gray-900"}`}>
      <div className="mx-auto max-w-5xl">
        <div className={`rounded-3xl border shadow-sm p-4 sm:p-5 ${isDark ? "border-[#3e4042] bg-[#242526]" : "border-gray-200 bg-white"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Business Calendar
              </h1>
              <p className={`text-xs mt-1 ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>
                Declare holidays, suspensions, one-off events, and recurring weekly closures.
                A dated closure always takes precedence over a recurring override on the same day.
              </p>
            </div>

            <button
              onClick={openCreateForm}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0 ${
                isDark ? "bg-yellow-400 text-black hover:bg-yellow-500" : "bg-pup-dark-maroon text-white hover:bg-[#3a0303]"
              }`}
            >
              {activeTab === "exceptions" ? "Add Closure" : "Add Recurring Override"}
            </button>
          </div>

          {/* Tabs */}
          <div className={`flex items-center gap-1 mb-4 border-b ${isDark ? "border-[#3e4042]" : "border-gray-200"}`}>
            <button
              onClick={() => setActiveTab("exceptions")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
                activeTab === "exceptions"
                  ? (isDark ? "border-yellow-400 text-yellow-400" : "border-pup-dark-maroon text-pup-dark-maroon")
                  : (isDark ? "border-transparent text-[#b0b3b8] hover:text-white" : "border-transparent text-gray-500 hover:text-gray-800")
              }`}
            >
              <CalendarDaysIcon className="h-4 w-4" />
              Closures
            </button>
            <button
              onClick={() => setActiveTab("overrides")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
                activeTab === "overrides"
                  ? (isDark ? "border-yellow-400 text-yellow-400" : "border-pup-dark-maroon text-pup-dark-maroon")
                  : (isDark ? "border-transparent text-[#b0b3b8] hover:text-white" : "border-transparent text-gray-500 hover:text-gray-800")
              }`}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Recurring Overrides
            </button>
          </div>

          <section className={`rounded-2xl overflow-hidden border shadow-sm ${isDark ? "border-[#3e4042] bg-[#242526]" : "border-gray-100 bg-white"}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b ${isDark ? "border-[#3e4042] bg-[#1a1a1c]/20" : "border-gray-200 bg-gray-50/50"}`}>
              <div className="w-full sm:max-w-md">
                <VoiceSearchInput value={search} onChange={(value) => setSearch(value)} placeholder="Search" />
              </div>

              <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer select-none ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>
                <input
                  type="checkbox"
                  checked={activeTab === "exceptions" ? includePast : includeExpired}
                  onChange={(e) =>
                    activeTab === "exceptions"
                      ? setIncludePast(e.target.checked)
                      : setIncludeExpired(e.target.checked)
                  }
                  className="h-3.5 w-3.5"
                />
                {activeTab === "exceptions" ? "Show past closures" : "Show expired overrides"}
              </label>
            </div>

            {activeTab === "exceptions" ? (
              <ExceptionsTable
                items={filteredExceptions}
                loading={exceptionsLoading}
                isDark={isDark}
                typeBadge={TYPE_BADGE}
                onEdit={openEditExceptionForm}
                onDelete={(record) => setDeleteTarget({ kind: "exception", record })}
              />
            ) : (
              <OverridesTable
                items={filteredOverrides}
                loading={overridesLoading}
                isDark={isDark}
                onEdit={openEditOverrideForm}
                onDelete={(record) => setDeleteTarget({ kind: "override", record })}
              />
            )}

            <Pagination
              isDark={isDark}
              meta={activeTab === "exceptions" ? exceptionsMeta : overridesMeta}
              onPrev={() =>
                activeTab === "exceptions"
                  ? setExceptionsPage((p) => Math.max(1, p - 1))
                  : setOverridesPage((p) => Math.max(1, p - 1))
              }
              onNext={() =>
                activeTab === "exceptions"
                  ? setExceptionsPage((p) => Math.min(exceptionsMeta.last_page, p + 1))
                  : setOverridesPage((p) => Math.min(overridesMeta.last_page, p + 1))
              }
            />
          </section>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/70" : "bg-black/50"}`}
            onClick={closeForm}
          />
          <div className={`relative w-full max-w-md mx-auto rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDark ? "bg-[#242526] border border-[#3e4042]" : "bg-white"}`}>
            <div className={`px-6 py-5 flex items-center justify-between shrink-0 ${isDark ? "bg-[#2a2a2f] border-b border-[#3e4042]" : "bg-pup-dark-maroon text-white"}`}>
              <div>
                <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                  {editingId
                    ? (activeTab === "exceptions" ? "Edit Closure" : "Edit Recurring Override")
                    : (activeTab === "exceptions" ? "Add Closure" : "Add Recurring Override")}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-[#b0b3b8]" : "text-white/60"}`}>
                  {activeTab === "exceptions"
                    ? "A one-off dated closure — always takes precedence over a recurring override."
                    : "A standing weekly rule, e.g. \"closed every Monday until further notice.\""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="h-1 w-full shrink-0 bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

            {activeTab === "exceptions" ? (
              <form onSubmit={handleExceptionSubmit} noValidate className="flex flex-col">
                <div className="p-6 space-y-4">
                  <div>
                    <label className={labelClass}>Type</label>
                    <select
                      name="type"
                      value={exceptionForm.type}
                      onChange={(e) => setExceptionForm((prev) => ({ ...prev, type: e.target.value }))}
                      className={inputClass}
                      required
                    >
                      {EXCEPTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {fieldErrors.type && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.type[0]}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Label</label>
                    <input
                      type="text"
                      value={exceptionForm.label}
                      onChange={(e) => setExceptionForm((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. Typhoon suspension"
                      className={inputClass}
                      maxLength={255}
                      required
                    />
                    {fieldErrors.label && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.label[0]}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Start Date</label>
                      <input
                        type="date"
                        value={exceptionForm.date}
                        onChange={(e) => setExceptionForm((prev) => ({ ...prev, date: e.target.value }))}
                        className={inputClass}
                        required
                      />
                      {fieldErrors.date && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.date[0]}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>End Date</label>
                      <input
                        type="date"
                        value={exceptionForm.end_date}
                        onChange={(e) => setExceptionForm((prev) => ({ ...prev, end_date: e.target.value }))}
                        className={inputClass}
                        min={exceptionForm.date || undefined}
                      />
                      <p className={`mt-1 text-[11px] ${isDark ? "text-[#8a8d91]" : "text-gray-400"}`}>Leave blank for a single day.</p>
                      {fieldErrors.end_date && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.end_date[0]}</p>}
                    </div>
                  </div>
                </div>

                <FormActions isDark={isDark} saving={saving} onCancel={closeForm} editingId={editingId} createLabel="Add Closure" />
              </form>
            ) : (
              <form onSubmit={handleOverrideSubmit} noValidate className="flex flex-col">
                <div className="p-6 space-y-4">
                  <div>
                    <label className={labelClass}>Day of Week</label>
                    <select
                      value={overrideForm.day_of_week}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, day_of_week: e.target.value }))}
                      className={inputClass}
                      required
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>{capitalize(d)}</option>
                      ))}
                    </select>
                    {fieldErrors.day_of_week && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.day_of_week[0]}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Label</label>
                    <input
                      type="text"
                      value={overrideForm.label}
                      onChange={(e) => setOverrideForm((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g. WFH Monday"
                      className={inputClass}
                      maxLength={255}
                      required
                    />
                    {fieldErrors.label && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.label[0]}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Status on This Day</label>
                    <div className={`inline-flex p-0.5 rounded-full ${isDark ? "bg-[#18191a] border border-[#3e4042]" : "bg-gray-300"}`}>
                      <button
                        type="button"
                        onClick={() => setOverrideForm((prev) => ({ ...prev, is_closed: true }))}
                        className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          overrideForm.is_closed
                            ? "bg-white text-gray-900 shadow-sm"
                            : (isDark ? "text-[#b0b3b8] hover:text-white" : "text-gray-600 hover:text-gray-900")
                        }`}
                      >
                        Closed
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideForm((prev) => ({ ...prev, is_closed: false }))}
                        className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          !overrideForm.is_closed
                            ? "bg-white text-gray-900 shadow-sm"
                            : (isDark ? "text-[#b0b3b8] hover:text-white" : "text-gray-600 hover:text-gray-900")
                        }`}
                      >
                        Open
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Effective From</label>
                      <input
                        type="date"
                        value={overrideForm.effective_from}
                        onChange={(e) => setOverrideForm((prev) => ({ ...prev, effective_from: e.target.value }))}
                        className={inputClass}
                        required
                      />
                      {fieldErrors.effective_from && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.effective_from[0]}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Effective Until</label>
                      <input
                        type="date"
                        value={overrideForm.effective_until}
                        onChange={(e) => setOverrideForm((prev) => ({ ...prev, effective_until: e.target.value }))}
                        className={inputClass}
                        min={overrideForm.effective_from || undefined}
                      />
                      <p className={`mt-1 text-[11px] ${isDark ? "text-[#8a8d91]" : "text-gray-400"}`}>Leave blank for "until further notice."</p>
                      {fieldErrors.effective_until && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.effective_until[0]}</p>}
                    </div>
                  </div>
                </div>

                <FormActions isDark={isDark} saving={saving} onCancel={closeForm} editingId={editingId} createLabel="Add Override" />
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title={deleteTarget?.kind === "exception" ? "Delete this closure?" : "Delete this recurring override?"}
        message={
          deleteTarget
            ? `"${deleteTarget.record.label}" will no longer affect the business calendar. This can't be undone.`
            : ""
        }
      />

      <SuccessToast message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
    </main>
  );
};

const FormActions = ({ isDark, saving, onCancel, editingId, createLabel }) => (
  <div className={`px-6 pb-6 pt-4 flex items-center justify-end gap-3 border-t shrink-0 ${isDark ? "border-[#3e4042]" : "border-gray-100"}`}>
    <button
      type="button"
      onClick={onCancel}
      disabled={saving}
      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
        isDark ? "text-[#b0b3b8] hover:bg-[#2a2a2f]" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={saving}
      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed ${
        isDark ? "bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]" : "bg-pup-dark-maroon text-white hover:bg-[#3a0303]"
      }`}
    >
      {saving ? "Saving..." : editingId ? "Save Changes" : createLabel}
    </button>
  </div>
);

const ExceptionsTable = ({ items, loading, isDark, typeBadge, onEdit, onDelete }) => {
  if (loading) {
    return <div className={`py-16 text-center text-sm ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Loading closures…</div>;
  }

  if (items.length === 0) {
    return (
      <div className={`flex flex-col items-center gap-2 py-16 text-center ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>
        <CalendarDaysIcon className="h-10 w-10 opacity-50" />
        <p className="text-sm font-medium">No closures found.</p>
        <p className="text-xs">Try a different search, or add a holiday, suspension, or event.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-175 text-sm">
        <thead>
          <tr className={isDark ? "border-b border-[#3e4042]" : "border-b border-gray-100"}>
            <th className={`px-5 py-4 text-left font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Label</th>
            <th className={`px-5 py-4 text-left font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Type</th>
            <th className={`px-5 py-4 text-left font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Dates</th>
            <th className={`px-5 py-4 text-center font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.holiday_id} className={`border-b last:border-0 transition-colors ${isDark ? "border-[#3e4042] hover:bg-[#2a2a2f]" : "border-gray-100 hover:bg-gray-50"}`}>
              <td className={`px-5 py-4 font-semibold ${isDark ? "text-[#e4e6eb]" : "text-gray-800"}`}>{item.label}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${typeBadge[item.type] ?? ""}`}>
                  {capitalize(item.type)}
                </span>
              </td>
              <td className={`px-5 py-4 ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`}>
                {item.date === item.end_date
                  ? formatDate(item.date)
                  : `${formatDate(item.date)} – ${formatDate(item.end_date)}`}
              </td>
              <td className="px-5 py-4 text-center">
                <RowActions isDark={isDark} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OverridesTable = ({ items, loading, isDark, onEdit, onDelete }) => {
  if (loading) {
    return <div className={`py-16 text-center text-sm ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Loading recurring overrides…</div>;
  }

  if (items.length === 0) {
    return (
      <div className={`flex flex-col items-center gap-2 py-16 text-center ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>
        <ArrowPathIcon className="h-10 w-10 opacity-50" />
        <p className="text-sm font-medium">No recurring overrides found.</p>
        <p className="text-xs">Try a different search, or add a standing weekly rule.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-175 text-sm">
        <thead>
          <tr className={isDark ? "border-b border-[#3e4042]" : "border-b border-gray-100"}>
            <th className={`px-5 py-4 text-left font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Label</th>
            <th className={`px-5 py-4 text-left font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Day</th>
            <th className={`px-5 py-4 text-left font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Status</th>
            <th className={`px-5 py-4 text-left font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Effective</th>
            <th className={`px-5 py-4 text-center font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.override_id} className={`border-b last:border-0 transition-colors ${isDark ? "border-[#3e4042] hover:bg-[#2a2a2f]" : "border-gray-100 hover:bg-gray-50"}`}>
              <td className={`px-5 py-4 font-semibold ${isDark ? "text-[#e4e6eb]" : "text-gray-800"}`}>{item.label}</td>
              <td className={`px-5 py-4 ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`}>{capitalize(item.day_of_week)}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                  item.is_closed
                    ? (isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700")
                    : (isDark ? "bg-green-900/30 text-green-300" : "bg-green-50 text-green-700")
                }`}>
                  {item.is_closed ? "Closed" : "Open"}
                </span>
              </td>
              <td className={`px-5 py-4 ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`}>
                {formatDate(item.effective_from)} – {item.effective_until ? formatDate(item.effective_until) : "Until further notice"}
              </td>
              <td className="px-5 py-4 text-center">
                <RowActions isDark={isDark} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RowActions = ({ isDark, onEdit, onDelete }) => (
  <div className="flex items-center justify-center gap-1">
    <button
      onClick={onEdit}
      className={`rounded-md p-2 transition-colors ${isDark ? "hover:bg-[#3a3b3c] text-[#b0b3b8] hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
      title="Edit"
    >
      <PencilSquareIcon className="h-4 w-4" />
    </button>
    <button
      onClick={onDelete}
      className={`rounded-md p-2 transition-colors ${isDark ? "hover:bg-red-950/40 text-[#b0b3b8] hover:text-red-400" : "hover:bg-red-50 text-gray-500 hover:text-red-600"}`}
      title="Delete"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  </div>
);

const Pagination = ({ isDark, meta, onPrev, onNext }) => {
  if (!meta || meta.last_page <= 1) return null;

  return (
    <div className={`flex items-center justify-between gap-3 px-5 py-3 border-t ${isDark ? "border-[#3e4042]" : "border-gray-100"}`}>
      <span className={`text-xs font-medium ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>
        Page {meta.current_page} of {meta.last_page}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={meta.current_page <= 1}
          className={`rounded-md p-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? "hover:bg-[#3a3b3c] text-[#b0b3b8]" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onNext}
          disabled={meta.current_page >= meta.last_page}
          className={`rounded-md p-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? "hover:bg-[#3a3b3c] text-[#b0b3b8]" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BusinessCalendarManagement;