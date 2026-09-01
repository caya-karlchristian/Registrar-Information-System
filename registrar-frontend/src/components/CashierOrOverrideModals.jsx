import React, { useState, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { EnvelopeIcon, XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { createCashierOverride, searchCashierOverrideUsers } from "../services/api";
import { useReferenceData } from "../context/ReferenceDataContext";
import VoiceSearchInput from "./VoiceSearchInput.jsx";
import VoiceTextareaInput from "./VoiceTextareaInput.jsx";
import InputGroup from "./InputGroup.jsx";
import DropdownGroup from "./DropDown.jsx";

/**
 * Read-only detail view — reason and verified_items are the actual
 * justification an admin gave for bypassing a money-facing check.
 */
export const CashierOverrideDetailsModal = ({ item, isDark, rowBorder, subtleText, statusOf, badgeClasses, onClose }) => {
  const status = statusOf(item);
  const items = Array.isArray(item.verified_items) ? item.verified_items : [];

  const formatTimelineDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " · " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center pt-16 sm:pt-4 pb-4 px-3 sm:px-4 backdrop-blur-sm bg-black/60 overflow-y-auto">
      <div
        className={`relative z-9999 w-full max-w-lg my-auto rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden border flex flex-col max-h-[calc(100vh-5rem)] sm:max-h-[85vh] animate-in fade-in zoom-in duration-200 ${
          isDark ? "bg-[#242526] border-[#3e4042] text-[#e4e6eb]" : "bg-white border-[#800000]/20 text-gray-900"
        }`}
      >
        {/* Top Header Banner matching MonthRangeModal.jsx */}
        <div
          className={`px-4 py-4 sm:px-6 sm:py-5 border-b-4 shrink-0 ${
            isDark ? "bg-[#1f1f1f] border-[#b98b00]" : "bg-[#800000] border-[#FFD700]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs text-amber-200 font-bold uppercase tracking-wider block">
                Official Receipt
              </span>
              <h3 className="text-lg sm:text-2xl text-white font-black uppercase tracking-tighter mt-0.5 truncate">
                OR #{item.or_number}
              </h3>
              <p className="text-[11px] sm:text-xs text-white/90 mt-0.5 flex items-center gap-1.5 font-normal truncate">
                <EnvelopeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200 shrink-0" />
                <span className="truncate">{item.user?.email ?? `User #${item.user_id}`}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className={`text-[10px] sm:text-xs ${badgeClasses(status.tone)}`}>{status.label}</span>
              <button
                onClick={onClose}
                className="p-1 rounded hover:opacity-90 shrink-0 text-white cursor-pointer"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Status warning banner if revoked */}
          {status.label === "Revoked" && (
            <div
              className={`p-3 sm:p-3.5 rounded-xl border flex items-start gap-2.5 sm:gap-3 text-xs leading-relaxed ${
                isDark ? "bg-red-950/30 border-red-800/40 text-red-300" : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
              <span>
                This receipt was revoked before verification. No items were confirmed against the physical copy.
              </span>
            </div>
          )}

          {/* History Timeline */}
          <div className="space-y-3 sm:space-y-4">
            <h4
              className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${
                isDark ? "text-white" : "text-[#800000]"
              }`}
            >
              HISTORY
            </h4>

            <div className="relative pl-5 sm:pl-6 space-y-4 sm:space-y-5">
              <div
                className={`absolute left-1 sm:left-[4.5px] top-2.5 bottom-2.5 w-[1.5px] ${
                  isDark ? "bg-gray-700/60" : "bg-gray-200"
                }`}
              />

              <div className="relative flex flex-col">
                <div
                  className={`absolute -left-5.75 sm:-left-6 top-1.5 w-2.5 h-2.5 rounded-full ${
                    isDark ? "bg-gray-400 ring-4 ring-[#242526]" : "bg-gray-400 ring-4 ring-white"
                  }`}
                />
                <div className="text-xs sm:text-sm font-bold break-all">
                  Created by {item.created_by_user?.email ?? "—"}
                </div>
                <div className={`text-[10px] sm:text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {formatTimelineDate(item.created_at)}
                </div>
              </div>

              {item.revoked_at && (
                <div className="relative flex flex-col">
                  <div
                    className={`absolute -left-5.75 sm:-left-6 top-1.5 w-2.5 h-2.5 rounded-full ${
                      isDark ? "bg-red-500 ring-4 ring-[#242526]" : "bg-red-500 ring-4 ring-white"
                    }`}
                  />
                  <div className="text-xs sm:text-sm font-bold text-red-500 break-all">
                    Revoked by {item.revoked_by_user?.email ?? "—"}
                  </div>
                  <div className={`text-[10px] sm:text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {formatTimelineDate(item.revoked_at)}
                  </div>

                  {item.reason && (
                    <div
                      className={`mt-2.5 sm:mt-3 p-3 sm:p-3.5 rounded-xl border ${
                        isDark ? "bg-[#1f1f1f] border-[#3e4042]" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className={`text-[10px] sm:text-xs font-semibold mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Reason on file
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-normal whitespace-pre-wrap break-all wrap-break-word ${
                          isDark ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        {item.reason}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!item.revoked_at && item.used_at && (
                <div className="relative flex flex-col">
                  <div
                    className={`absolute -left-5.75 sm:-left-[24px] top-1.5 w-2.5 h-2.5 rounded-full ${
                      isDark ? "bg-emerald-500 ring-4 ring-[#242526]" : "bg-emerald-500 ring-4 ring-white"
                    }`}
                  />
                  <div className="text-xs sm:text-sm font-bold text-emerald-500 break-all">
                    Used by {item.user?.email ?? "—"}
                  </div>
                  <div className={`text-[10px] sm:text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {formatTimelineDate(item.used_at)}
                  </div>

                  {item.reason && (
                    <div
                      className={`mt-2.5 sm:mt-3 p-3 sm:p-3.5 rounded-xl border ${
                        isDark ? "bg-[#1f1f1f] border-[#3e4042]" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className={`text-[10px] sm:text-xs font-semibold mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Reason on file
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-normal whitespace-pre-wrap break-all wrap-break-word ${
                          isDark ? "text-gray-200" : "text-gray-800"
                        }`}
                      >
                        {item.reason}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!item.revoked_at && !item.used_at && item.reason && (
                <div className="relative flex flex-col">
                  <div
                    className={`absolute -left-5.75 sm:-left-6 top-1.5 w-2.5 h-2.5 rounded-full ${
                      isDark ? "bg-emerald-500 ring-4 ring-[#242526]" : "bg-emerald-500 ring-4 ring-white"
                    }`}
                  />
                  <div className="text-xs sm:text-sm font-bold text-emerald-500">Override Active</div>
                  <div className={`text-[10px] sm:text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {formatTimelineDate(item.created_at)}
                  </div>
                  <div
                    className={`mt-2.5 sm:mt-3 p-3 sm:p-3.5 rounded-xl border ${
                      isDark ? "bg-[#1f1f1f] border-[#3e4042]" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className={`text-[10px] sm:text-xs font-semibold mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      Reason on file
                    </div>
                    <div
                      className={`text-xs sm:text-sm font-normal whitespace-pre-wrap break-all wrap-break-word ${
                        isDark ? "text-gray-200" : "text-gray-800"
                      }`}
                    >
                      {item.reason}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verified Items Section */}
          {items.length > 0 && (
            <div className="space-y-2">
              <h4
                className={`text-[11px] sm:text-xs font-black uppercase tracking-wider ${
                  isDark ? "text-white" : "text-[#800000]"
                }`}
              >
                VERIFIED ITEMS
              </h4>
              <div className={`rounded-xl border overflow-x-auto scrollbar-thin ${rowBorder}`}>
                <table className="w-full text-xs sm:text-sm min-w-70">
                  <thead>
                    <tr className={isDark ? "bg-[#1f1f1f] text-gray-300" : "bg-gray-100 text-gray-700"}>
                      <th className="px-3 py-2 text-left font-semibold text-[11px] sm:text-xs">Document</th>
                      <th className="px-3 py-2 text-left font-semibold text-[11px] sm:text-xs">Qty</th>
                      <th className="px-3 py-2 text-left font-semibold text-[11px] sm:text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-[#3e4042]" : "divide-gray-100"}`}>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium">{it.document}</td>
                        <td className="px-3 py-2">{it.quantity}</td>
                        <td className="px-3 py-2">{it.amount || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer matching MonthRangeModal */}
        <div
          className={`px-4 py-3 sm:px-6 sm:py-4 border-t-2 shrink-0 flex justify-end ${
            isDark ? "bg-[#1f1f1f] border-[#3e4042]" : "bg-gray-50 border-gray-200"
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-colors duration-150 shadow-sm cursor-pointer ${
              isDark
                ? "bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50]"
                : "bg-[#800000] hover:bg-[#4a0000] text-[#FFD700]"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

CashierOverrideDetailsModal.propTypes = {
  item: PropTypes.object.isRequired,
  isDark: PropTypes.bool,
  rowBorder: PropTypes.string,
  subtleText: PropTypes.string,
  statusOf: PropTypes.func.isRequired,
  badgeClasses: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Modal form for creating a new cashier OR override with Voice inputs.
 */
export const CreateCashierOverrideModal = ({ isDark, subtleText, onClose, onCreated, onError }) => {
  const refData = useReferenceData();
  const documentTypes = refData?.documentTypes ?? [];
  const certifications = refData?.certifications ?? [];

  const combinedDocOptions = useMemo(() => {
    const docs = (documentTypes || [])
      .filter((d) => !d.is_archived)
      .map((d) => d.document_name);
    const certs = (certifications || [])
      .filter((c) => !c.is_archived)
      .map((c) => c.certificate_name);
    return Array.from(new Set([...docs, ...certs])).sort();
  }, [documentTypes, certifications]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  const [orNumber, setOrNumber] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || selectedUser) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await searchCashierOverrideUsers(query.trim());
        setResults(res.data?.data ?? []);
        setShowResults(true);
      } catch (err) {
        console.error("User search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selectedUser]);

  const pickUser = (u) => {
    setSelectedUser(u);
    setQuery(`${u.full_name} (${u.email})`);
    setShowResults(false);
    setFieldErrors((prev) => ({ ...prev, user_id: null }));
  };

  const clearUser = () => {
    setSelectedUser(null);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { document: "", quantity: 1, amount: "" }]);
  };

  const removeItemRow = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx, field, val) => {
    setItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const validate = () => {
    const errs = {};
    if (!selectedUser?.user_id) errs.user_id = "Please select a student account.";
    if (!orNumber.trim()) {
      errs.or_number = "OR number is required.";
    } else if (!/^\d{7}$/.test(orNumber.trim())) {
      errs.or_number = "Official Receipt Number must be exactly 7 digits.";
    }
    if (!reason.trim() || reason.trim().length < 10) {
      errs.reason = "Reason must be at least 10 characters long.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const cleanItems = items
        .filter((it) => it.document.trim())
        .map((it) => ({
          document: it.document.trim(),
          quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
          amount: String(it.amount || "").trim(),
        }));

      const payload = {
        user_id: selectedUser.user_id,
        or_number: orNumber.trim(),
        reason: reason.trim(),
        verified_items: cleanItems.length > 0 ? cleanItems : null,
      };

      const res = await createCashierOverride(payload);
      onCreated(res.data?.data);
      onClose();
    } catch (err) {
      console.error("Failed to create cashier OR override:", err);
      const responseErrors = err?.response?.data?.errors;
      if (responseErrors) {
        const formatted = {};
        Object.keys(responseErrors).forEach((key) => {
          formatted[key] = Array.isArray(responseErrors[key]) ? responseErrors[key][0] : responseErrors[key];
        });
        setFieldErrors(formatted);
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
    <div className="fixed inset-0 z-9999 flex items-center justify-center pt-16 sm:pt-4 pb-4 px-3 sm:px-4 backdrop-blur-sm bg-black/60 overflow-y-auto">
      <div
        className={`relative z-9999 w-full max-w-2xl my-auto rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden border flex flex-col max-h-[calc(100vh-5rem)] sm:max-h-[85vh] animate-in fade-in zoom-in duration-200 ${
          isDark ? "bg-[#242526] border-[#3e4042] text-[#e4e6eb]" : "bg-white border-[#800000]/20 text-gray-900"
        }`}
      >
        {/* Top Header Banner matching MonthRangeModal.jsx and DetailsModal */}
        <div
          className={`px-4 py-4 sm:px-6 sm:py-5 border-b-4 shrink-0 ${
            isDark ? "bg-[#1f1f1f] border-[#b98b00]" : "bg-[#800000] border-[#FFD700]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs text-amber-200 font-bold uppercase tracking-wider block">
                Safety Valve
              </span>
              <h3 className="text-lg sm:text-xl text-white font-black uppercase tracking-tighter mt-0.5 truncate">
                New Cashier OR Override
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:opacity-90 shrink-0 text-white cursor-pointer"
              title="Close"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <p className={`text-[11px] sm:text-xs font-normal leading-normal ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Scoped to this one OR number and student only — every other request goes through Cashier API.
          </p>

          {/* Student picker and OR Number on same row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Student picker with VoiceSearchInput */}
            <div className="relative" ref={searchRef}>
              <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide mb-1 block">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <VoiceSearchInput
                  value={query}
                  onChange={(val) => {
                    setQuery(val);
                    if (!val) {
                      setSelectedUser(null);
                      setShowResults(false);
                    }
                  }}
                  placeholder="Search by name or email…"
                />
              </div>
              {showResults && !selectedUser && query.trim().length >= 2 && (
                <div
                  className={`absolute z-20 w-full mt-1 rounded-lg border shadow-lg max-h-52 overflow-y-auto ${
                    isDark ? "bg-[#1a1b1e] border-[#3e4042]" : "bg-white border-gray-200"
                  }`}
                >
                  {searching ? (
                    <div className={`px-3 py-2.5 text-sm ${subtleText}`}>Searching…</div>
                  ) : results.length === 0 ? (
                    <div className={`px-3 py-2.5 text-sm ${subtleText}`}>
                      No matching student or alumni account.
                    </div>
                  ) : (
                    results.map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => pickUser(u)}
                        className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer ${
                          isDark ? "hover:bg-[#242526]" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-medium truncate">{u.full_name}</div>
                        <div className={`text-xs ${subtleText} truncate`}>
                          {u.email} · {u.role_name}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {fieldErrors.user_id && <p className="text-xs text-red-500 mt-1">{fieldErrors.user_id}</p>}
            </div>

            {/* OR Number with InputGroup */}
            <div>
              <InputGroup
                label="OR Number"
                name="or_number"
                value={orNumber}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 7);
                  setOrNumber(digitsOnly);
                  setFieldErrors((prev) => ({ ...prev, or_number: null }));
                }}
                placeholder="e.g. 0234891"
                maxLength={7}
                required
                labelColor="text-[11px] sm:text-xs font-semibold uppercase tracking-wide"
              />
              {fieldErrors.or_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.or_number}</p>}
            </div>
          </div>

          {/* Reason with VoiceTextareaInput */}
          <div>
            <VoiceTextareaInput
              id="override-reason"
              label="Reason"
              labelColor="text-[11px] sm:text-xs font-semibold uppercase tracking-wide mb-1 block"
              value={reason}
              onChange={(val) => {
                setReason(val);
                setFieldErrors((prev) => ({ ...prev, reason: null }));
              }}
              rows={3}
              maxLength={1000}
              placeholder={`e.g. "Verified physical receipt at the counter — cashier system typo'd the middle name, OR itself is genuine."`}
              error={fieldErrors.reason}
            />
          </div>

          {/* Verified items */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide block">
                  Verified Items <span className={`font-normal lowercase ${subtleText}`}>(optional)</span>
                </label>
                <p className={`text-[10px] sm:text-xs ${subtleText}`}>
                  Items physically printed on the receipt for verification.
                </p>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0 ${
                  isDark
                    ? "bg-amber-400/15 text-amber-300 border border-amber-400/40 hover:bg-amber-400/25"
                    : "bg-[#800000] text-[#FFD700] hover:bg-[#5a0000]"
                }`}
              >
                <span className="text-sm leading-none">+</span> Add item
              </button>
            </div>

            {items.length === 0 ? (
              <div
                onClick={addItemRow}
                className={`p-3 sm:p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                  isDark
                    ? "border-[#3e4042] hover:border-amber-400/50 bg-[#1a1b1e]/40 hover:bg-[#1a1b1e]"
                    : "border-gray-200 hover:border-[#800000]/40 bg-gray-50/50 hover:bg-gray-50"
                }`}
              >
                <p className={`text-xs ${subtleText}`}>
                  No verified items added yet. Click <span className="font-semibold text-amber-500 dark:text-amber-400">+ Add item</span> to list documents from the physical receipt.
                </p>
              </div>
            ) : (
              <div className={`p-3 rounded-xl border space-y-2.5 ${isDark ? "bg-[#1a1b1e]/60 border-[#3e4042]" : "bg-gray-50/70 border-gray-200"}`}>
                {/* Column Headers */}
                <div className="grid grid-cols-[1fr_60px_76px_28px] sm:grid-cols-[1fr_72px_96px_32px] gap-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <span>Document / Certification</span>
                  <span>Qty</span>
                  <span>Amount</span>
                  <span></span>
                </div>

                {/* Item Rows */}
                {items.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_60px_76px_28px] sm:grid-cols-[1fr_72px_96px_32px] gap-2 items-center"
                  >
                    <DropdownGroup
                      name={`document-${idx}`}
                      value={row.document}
                      onChange={(e) => updateItemRow(idx, "document", e.target.value)}
                      options={combinedDocOptions}
                      direction="up"
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
                      placeholder="₱0.00"
                      className={inputClasses}
                      style={{ minWidth: 0, width: "100%" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center cursor-pointer"
                      title="Remove item"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer matching MonthRangeModal */}
        <div
          className={`px-4 py-3 sm:px-6 sm:py-4 border-t-2 shrink-0 flex justify-end gap-3 ${
            isDark ? "bg-[#1f1f1f] border-[#3e4042]" : "bg-gray-50 border-gray-200"
          }`}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            className={`px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-bold uppercase tracking-widest rounded transition-colors duration-150 cursor-pointer disabled:opacity-50 ${
              isDark ? "text-[#f5c542] hover:bg-[#2a2a2a]" : "text-[#800000] hover:bg-gray-200"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-5 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-colors duration-150 shadow-sm cursor-pointer disabled:opacity-50 ${
              isDark
                ? "bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] border border-[#4e4f50]"
                : "bg-[#800000] hover:bg-[#4a0000] text-[#FFD700]"
            }`}
          >
            {submitting ? "Creating..." : "Create Override"}
          </button>
        </div>
      </div>
    </div>
  );
};

CreateCashierOverrideModal.propTypes = {
  isDark: PropTypes.bool,
  subtleText: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
};
