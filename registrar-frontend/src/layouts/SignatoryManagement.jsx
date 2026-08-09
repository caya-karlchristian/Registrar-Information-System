import React, { useState } from "react";
import { PlusIcon, PencilSquareIcon, TrashIcon, UserGroupIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import { useReferenceData } from "../context/ReferenceDataContext";
import { createSignatory, updateSignatory, deleteSignatory } from "../services/api";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import ConfirmationModal from "../components/ConfirmationModal.jsx";

const EMPTY_FORM = { name: "", position: "", sort_order: 0 };

/**
 * Admin-only CRUD screen for the signatories table (see
 * SignatoryController / 2026_08_13_000000_create_signatories_table).
 * These are the people selectable as "Signee" when generating a
 * certificate (GenerateCertificate.jsx) — this screen is what lets an
 * admin add/rename/reorder/remove them without a code deploy.
 *
 * Self-contained like CertificateTemplateManagement — fetches nothing
 * of its own beyond what ReferenceDataContext already provides, and
 * owns its own toasts/modals so the parent tab switcher
 * (DocumentAndCertificateManagement.jsx) doesn't need any state for it.
 */
const SignatoryManagement = () => {
  const { isDark } = useTheme();
  const { signatories, refreshSignatories } = useReferenceData();

  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [editingId, setEditingId]     = useState(null); // null = creating
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null); // signatory being confirmed for delete

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = (signatory) => {
    setEditingId(signatory.signatory_id);
    setForm({
      name: signatory.name,
      position: signatory.position,
      sort_order: signatory.sort_order ?? 0,
    });
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return; // don't let the modal be dismissed mid-save
    setIsFormOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "sort_order" ? value : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    // sort_order is optional server-side, but coerce a blank input to 0
    // rather than sending an empty string (would fail the integer rule).
    const payload = {
      name: form.name.trim(),
      position: form.position.trim(),
      sort_order: form.sort_order === "" ? 0 : Number(form.sort_order),
    };

    try {
      if (editingId) {
        await updateSignatory(editingId, payload);
        setSuccessMsg("Signatory updated successfully!");
      } else {
        await createSignatory(payload);
        setSuccessMsg("Signatory added successfully!");
      }
      await refreshSignatories();
      setIsFormOpen(false);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 422) {
        // Laravel validation error shape: { message, errors: { field: [msg] } }
        setFieldErrors(err.response.data?.errors ?? {});
        setErrorMsg(err.response.data?.message || "Please fix the highlighted fields.");
      } else if (status === 403) {
        setErrorMsg("You don't have permission to manage signatories.");
      } else {
        setErrorMsg("Couldn't save this signatory. Please try again.");
      }
      console.error("Failed to save signatory:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSignatory(deleteTarget.signatory_id);
      await refreshSignatories();
      setSuccessMsg("Signatory deleted.");
    } catch (err) {
      console.error("Failed to delete signatory:", err);
      const status = err?.response?.status;
      setErrorMsg(
        status === 403
          ? "You don't have permission to manage signatories."
          : "Couldn't delete this signatory. Please try again."
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 ${
    isDark
      ? "bg-[#18191a] border-[#3e4042] text-[#e4e6eb] focus:ring-yellow-400/40 focus:border-yellow-400/60"
      : "bg-white border-gray-300 text-gray-900 focus:ring-pup-maroon/30 focus:border-pup-maroon"
  }`;

  return (
    <main className={`min-h-screen p-4 sm:p-6 ${isDark ? "bg-[#18191a] text-[#e4e6eb]" : "bg-[#f8f5f2] text-gray-900"}`}>
      <div className="mx-auto max-w-4xl">
        <section className={`overflow-hidden rounded-2xl border shadow-sm ${isDark ? "border-[#3e4042] bg-[#242526]" : "border-gray-200 bg-white"}`}>
          <header className={`flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-[#3e4042] bg-[#2a2a2f]" : "border-gray-100 bg-white"}`}>
            <div>
              <h1 className={`text-xl font-bold sm:text-2xl ${isDark ? "text-white" : "text-[#4f2018]"}`}>
                Signatories
              </h1>
              <p className={`mt-1 text-xs ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>
                Manage the people selectable as "Signee" when generating certificates. Lower sort order appears first in the dropdown.
              </p>
            </div>
            <button
              onClick={openCreateForm}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors ${
                isDark ? "bg-[#800000] hover:bg-[#a00000]" : "bg-pup-maroon hover:bg-pup-dark-maroon"
              }`}
            >
              <PlusIcon className="h-4 w-4" />
              Add Signatory
            </button>
          </header>

          <div>
            {signatories.length === 0 ? (
              <div className={`flex flex-col items-center gap-2 py-16 text-center ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>
                <UserGroupIcon className="h-10 w-10 opacity-50" />
                <p className="text-sm font-medium">No signatories yet.</p>
                <p className="text-xs">Add one to make it selectable on certificates.</p>
              </div>
            ) : (
              <ul className={`divide-y ${isDark ? "divide-[#3e4042]" : "divide-gray-100"}`}>
                {signatories.map((s) => (
                  <li key={s.signatory_id} className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isDark ? "bg-[#18191a] text-[#b0b3b8]" : "bg-gray-100 text-gray-500"
                        }`}
                        title="Sort order"
                      >
                        {s.sort_order}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{s.name}</p>
                        <p className={`truncate text-xs ${isDark ? "text-[#b0b3b8]" : "text-gray-500"}`}>{s.position}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEditForm(s)}
                        className={`rounded-md p-2 transition-colors ${isDark ? "hover:bg-[#3a3b3c] text-[#b0b3b8] hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-800"}`}
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className={`rounded-md p-2 transition-colors ${isDark ? "hover:bg-red-950/40 text-[#b0b3b8] hover:text-red-400" : "hover:bg-red-50 text-gray-500 hover:text-red-600"}`}
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50  flex items-center justify-center p-4">
          <div
            className={`absolute inset-0 backdrop-blur-sm ${isDark ? "bg-black/70" : "bg-black/50"}`}
            onClick={closeForm}
          />
          <div className={`relative w-full max-w-md mx-auto rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDark ? "bg-[#242526] border border-[#3e4042]" : "bg-white"}`}>
            <div className={`px-6 py-5 flex items-center justify-between shrink-0 ${isDark ? "bg-[#2a2a2f] border-b border-[#3e4042]" : "bg-pup-dark-maroon text-white"}`}>
              <div>
                <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                  {editingId ? "Edit Signatory" : "Add Signatory"}
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-[#b0b3b8]" : "text-white/60"}`}>
                  Keep this list ordered for certificate selection.
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

            <form onSubmit={handleSubmit} noValidate className="flex flex-col">
              <div className="p-6 space-y-4">
                <div>
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Juan D. Dela Cruz"
                    className={inputClass}
                    maxLength={255}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.name[0]}</p>
                  )}
                </div>

                <div>
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`}>
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    placeholder="e.g. Assistant Registrar"
                    className={inputClass}
                    maxLength={255}
                    required
                  />
                  {fieldErrors.position && (
                    <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.position[0]}</p>
                  )}
                </div>

                <div>
                  <label className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#b0b3b8]" : "text-gray-600"}`}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    name="sort_order"
                    value={form.sort_order}
                    onChange={handleChange}
                    className={inputClass}
                  />
                  {fieldErrors.sort_order && (
                    <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.sort_order[0]}</p>
                  )}
                </div>
              </div>

              <div className={`px-6 pb-6 pt-4 flex items-center justify-end gap-3 border-t shrink-0 ${isDark ? "border-[#3e4042]" : "border-gray-100"}`}>
                <button
                  type="button"
                  onClick={closeForm}
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
                    isDark
                      ? "bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]"
                      : "bg-pup-dark-maroon text-white hover:bg-[#3a0303]"
                  }`}
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Signatory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete this signatory?"
        message={deleteTarget ? `"${deleteTarget.name}" will no longer be selectable on new certificates. This can't be undone.` : ""}
      />

      <SuccessToast message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
    </main>
  );
};

export default SignatoryManagement;
