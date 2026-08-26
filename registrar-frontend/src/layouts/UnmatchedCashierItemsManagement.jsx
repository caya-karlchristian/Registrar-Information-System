import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useReferenceData } from "../context/ReferenceDataContext";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import {
  getUnmatchedCashierItems,
  resolveUnmatchedCashierItem,
  dismissUnmatchedCashierItem,
} from "../services/api";

/**
 * Admin review screen for CashierDocumentSuggester's naming-drift fix
 * (Phase 2/5 of the OR-first reorder). Every cashier receipt label that
 * couldn't be matched to a document/certificate type lands here, ordered
 * by how often it's been seen. Attaching one to the right type in
 * "Resolve" appends it to that type's cashier_document_patterns — every
 * future receipt using that exact label auto-matches from then on, no
 * code deploy required. "Dismiss" is for labels that aren't a real
 * document at all (a one-off misc fee) and just need to stop cluttering
 * the queue.
 */
const UnmatchedCashierItemsManagement = () => {
  const { isDark } = useTheme();
  const { documentTypes, certifications } = useReferenceData();

  const [showResolved, setShowResolved] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // { open, item, targetKind: 'document' | 'certificate', targetId }
  const [resolveModal, setResolveModal] = useState({ open: false, item: null, targetKind: "document", targetId: "" });
  // { open, item }
  const [dismissConfirm, setDismissConfirm] = useState({ open: false, item: null });
  const [actionLoading, setActionLoading] = useState(false);

  const activeDocumentTypes = useMemo(
    () => (documentTypes || []).filter((d) => !d.is_archived),
    [documentTypes]
  );
  const activeCertifications = useMemo(
    () => (certifications || []).filter((c) => !c.is_archived),
    [certifications]
  );

  const loadItems = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await getUnmatchedCashierItems({
        resolved: showResolved ? 1 : 0,
        page,
      });
      setItems(res.data?.data ?? []);
      setMeta({
        current_page: res.data?.current_page ?? 1,
        last_page: res.data?.last_page ?? 1,
      });
    } catch (err) {
      console.error("Failed to load unmatched cashier items:", err);
      setErrorMsg("Couldn't load unmatched cashier items. Please try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => {
    loadItems(1);
  }, [loadItems]);

  const openResolveModal = (item) => {
    setResolveModal({ open: true, item, targetKind: "document", targetId: "" });
  };

  const closeResolveModal = () => {
    setResolveModal({ open: false, item: null, targetKind: "document", targetId: "" });
  };

  const handleResolveSubmit = async () => {
    const { item, targetKind, targetId } = resolveModal;
    if (!targetId) {
      setErrorMsg("Please select a document or certificate type first.");
      return;
    }

    try {
      setActionLoading(true);
      const payload = targetKind === "document"
        ? { document_type_id: Number(targetId) }
        : { certificate_type_id: Number(targetId) };

      await resolveUnmatchedCashierItem(item.unmatched_cashier_item_id, payload);

      setItems((prev) => prev.filter((i) => i.unmatched_cashier_item_id !== item.unmatched_cashier_item_id));
      setSuccessMsg(`"${item.raw_label}" resolved — future receipts with this label will auto-match.`);
      closeResolveModal();
    } catch (err) {
      console.error("Failed to resolve unmatched cashier item:", err);
      setErrorMsg(err?.response?.data?.message || "Couldn't resolve this item. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissConfirm = async () => {
    const { item } = dismissConfirm;
    try {
      setActionLoading(true);
      await dismissUnmatchedCashierItem(item.unmatched_cashier_item_id);
      setItems((prev) => prev.filter((i) => i.unmatched_cashier_item_id !== item.unmatched_cashier_item_id));
      setSuccessMsg(`"${item.raw_label}" dismissed.`);
      setDismissConfirm({ open: false, item: null });
    } catch (err) {
      console.error("Failed to dismiss unmatched cashier item:", err);
      setErrorMsg(err?.response?.data?.message || "Couldn't dismiss this item. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const cardClasses = isDark
    ? "bg-[#18191a] text-[#e4e6eb]"
    : "bg-white text-gray-900";
  const rowBorder = isDark ? "border-[#3e4042]" : "border-gray-200";
  const subtleText = isDark ? "text-[#b0b3b8]" : "text-gray-500";

  return (
    <div className={`font-sans rounded-2xl p-4 sm:px-6 ${cardClasses}`}>
      {/* Top bar: tab toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-5 mb-2">
        <div>
          <h2 className="text-lg font-bold">Unmatched Cashier Items</h2>
          <p className={`text-xs mt-1 ${subtleText}`}>
            Receipt labels the system couldn't automatically match to a document or certificate type.
            Resolving one teaches the system to recognize it going forward.
          </p>
        </div>

        <div className={`inline-flex rounded-full p-1 shrink-0 ${isDark ? "bg-[#242526] border border-[#3e4042]" : "bg-gray-100 border border-gray-200"}`}>
          <button
            onClick={() => setShowResolved(false)}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition-all cursor-pointer ${
              !showResolved
                ? isDark ? "bg-yellow-400 text-gray-900" : "bg-pup-dark-maroon text-white"
                : isDark ? "text-[#b0b3b8]" : "text-gray-500"
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition-all cursor-pointer ${
              showResolved
                ? isDark ? "bg-yellow-400 text-gray-900" : "bg-pup-dark-maroon text-white"
                : isDark ? "text-[#b0b3b8]" : "text-gray-500"
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${rowBorder}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-left ${isDark ? "bg-[#242526]" : "bg-gray-50"}`}>
              <th className="px-4 py-3 font-semibold">Receipt Label</th>
              <th className="px-4 py-3 font-semibold">Occurrences</th>
              <th className="px-4 py-3 font-semibold">Last Seen</th>
              {showResolved && <th className="px-4 py-3 font-semibold">Resolved By</th>}
              {!showResolved && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={`px-4 py-8 text-center ${subtleText}`}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className={`px-4 py-8 text-center ${subtleText}`}>
                  {showResolved ? "No resolved items yet." : "Nothing unresolved right now — all clear!"}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.unmatched_cashier_item_id} className={`border-t ${rowBorder}`}>
                  <td className="px-4 py-3 font-medium">{item.raw_label}</td>
                  <td className="px-4 py-3">{item.occurrence_count}</td>
                  <td className={`px-4 py-3 ${subtleText}`}>
                    {item.last_seen_at ? new Date(item.last_seen_at).toLocaleDateString() : "—"}
                  </td>
                  {showResolved ? (
                    <td className={`px-4 py-3 ${subtleText}`}>
                      {item.resolved_by_user
                        ? (item.resolved_by_user.admin_profile
                            ? `${item.resolved_by_user.admin_profile.first_name} ${item.resolved_by_user.admin_profile.last_name}`
                            : item.resolved_by_user.email)
                        : "—"}
                    </td>
                  ) : (
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openResolveModal(item)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                          isDark ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300" : "bg-pup-dark-maroon text-white hover:bg-pup-maroon"
                        }`}
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => setDismissConfirm({ open: true, item })}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isDark ? "border-[#3e4042] text-[#b0b3b8] hover:bg-[#242526]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Dismiss
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4 text-sm">
          <button
            disabled={meta.current_page <= 1 || loading}
            onClick={() => loadItems(meta.current_page - 1)}
            className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${rowBorder}`}
          >
            Previous
          </button>
          <span className={subtleText}>Page {meta.current_page} of {meta.last_page}</span>
          <button
            disabled={meta.current_page >= meta.last_page || loading}
            onClick={() => loadItems(meta.current_page + 1)}
            className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${rowBorder}`}
          >
            Next
          </button>
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-[2px] bg-black/50">
          <div className={`rounded-xl shadow-xl w-full max-w-md p-6 ${isDark ? "bg-[#242526] border border-[#3e4042] text-[#e4e6eb]" : "bg-white border border-gray-100 text-gray-900"}`}>
            <h3 className="text-lg font-bold mb-1">Resolve Receipt Label</h3>
            <p className={`text-sm mb-4 ${subtleText}`}>
              Attach <strong>"{resolveModal.item?.raw_label}"</strong> to the correct type. Future receipts
              using this exact label will auto-match to it.
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setResolveModal((s) => ({ ...s, targetKind: "document", targetId: "" }))}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg border cursor-pointer ${
                  resolveModal.targetKind === "document"
                    ? isDark ? "bg-yellow-400 text-gray-900 border-yellow-400" : "bg-pup-dark-maroon text-white border-pup-dark-maroon"
                    : `${rowBorder} ${subtleText}`
                }`}
              >
                Document
              </button>
              <button
                onClick={() => setResolveModal((s) => ({ ...s, targetKind: "certificate", targetId: "" }))}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg border cursor-pointer ${
                  resolveModal.targetKind === "certificate"
                    ? isDark ? "bg-yellow-400 text-gray-900 border-yellow-400" : "bg-pup-dark-maroon text-white border-pup-dark-maroon"
                    : `${rowBorder} ${subtleText}`
                }`}
              >
                Certificate
              </button>
            </div>

            <select
              value={resolveModal.targetId}
              onChange={(e) => setResolveModal((s) => ({ ...s, targetId: e.target.value }))}
              className={`w-full p-2.5 rounded-lg border text-sm mb-6 ${isDark ? "bg-[#1a1b1e] border-[#3e4042] text-white" : "bg-white border-gray-300 text-gray-900"}`}
            >
              <option value="">Select {resolveModal.targetKind === "document" ? "a document type" : "a certificate type"}...</option>
              {(resolveModal.targetKind === "document" ? activeDocumentTypes : activeCertifications).map((t) => (
                <option
                  key={resolveModal.targetKind === "document" ? t.document_type_id : t.certificate_type_id}
                  value={resolveModal.targetKind === "document" ? t.document_type_id : t.certificate_type_id}
                >
                  {resolveModal.targetKind === "document" ? t.document_name : t.certificate_name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeResolveModal}
                disabled={actionLoading}
                className={`text-sm font-semibold px-4 py-2 rounded-lg border cursor-pointer disabled:opacity-50 ${rowBorder}`}
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={actionLoading}
                className={`text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 ${isDark ? "bg-yellow-400 text-gray-900" : "bg-pup-dark-maroon text-white"}`}
              >
                {actionLoading ? "Resolving..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dismiss confirmation */}
      {dismissConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-[2px] bg-black/50">
          <div className={`rounded-xl shadow-xl w-full max-w-sm p-6 ${isDark ? "bg-[#242526] border border-[#3e4042] text-[#e4e6eb]" : "bg-white border border-gray-100 text-gray-900"}`}>
            <h3 className="text-lg font-bold mb-2">Dismiss this label?</h3>
            <p className={`text-sm mb-6 ${subtleText}`}>
              <strong>"{dismissConfirm.item?.raw_label}"</strong> will be marked resolved without attaching it to
              any document or certificate type — use this for labels that aren't a real document, like a one-off
              fee line. It won't be suggested to future auto-attach, but it's removed from this queue.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDismissConfirm({ open: false, item: null })}
                disabled={actionLoading}
                className={`text-sm font-semibold px-4 py-2 rounded-lg border cursor-pointer disabled:opacity-50 ${rowBorder}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDismissConfirm}
                disabled={actionLoading}
                className="text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 bg-red-600 text-white hover:bg-red-700"
              >
                {actionLoading ? "Dismissing..." : "Dismiss"}
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

export default UnmatchedCashierItemsManagement;