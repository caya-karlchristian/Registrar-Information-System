import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import DropDown from "../components/DropDown";
import InputGroup from "../components/InputGroup";
import ErrorToast from "./ErrorToast";
import ConfirmationModal from "./ConfirmationModal";
import { useTheme } from "../context/ThemeContext";

// Only admin-level roles — Super Admin cannot create students/alumni
const ROLE_OPTIONS = ["Admin", "Super Admin"];
// Status is only ever shown/editable on the EDIT form — on create it is
// always server-set to "Pending Activation" (see AdminUserService::create()).
const STATUS_OPTIONS = ["Activated", "Deactivated"];

const ROLE_TO_ID = { "Admin": 3, "Super Admin": 4 };
const ID_TO_ROLE = { 3: "Admin", 4: "Super Admin" };

const EMPTY_FORM = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  email: "",
  role: "Admin",
  status: "Activated",
  policy: "",
};

const UserModal = ({ isOpen, onClose, onSubmit, editData = null, submitting = false, systemPolicies = [] }) => {
  const isEdit = !!editData;
  const { isDark } = useTheme();
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (isEdit && editData) {
      const profile = editData.admin_profile || {};
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        first_name: profile.first_name || "",
        middle_name: profile.middle_name || "",
        last_name: profile.last_name || "",
        suffix: profile.suffix || "",
        email: editData.email || "",
        role: ID_TO_ROLE[editData.role_id] || "Admin",
        status: editData.status || "Activated",
        // Editing an existing user's policy still goes through "Manage
        // Access" (PolicyModal) — this modal only sets it at creation time.
        policy: "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const hasChanges = () => {
    if (isEdit && editData) {
      const profile = editData.admin_profile || {};
      return (
        form.first_name !== (profile.first_name || "") ||
        form.middle_name !== (profile.middle_name || "") ||
        form.last_name !== (profile.last_name || "") ||
        form.suffix !== (profile.suffix || "") ||
        form.email !== (editData.email || "") ||
        form.role !== (ID_TO_ROLE[editData.role_id] || "Admin") ||
        form.status !== (editData.status || "Activated")
      );
    }
    return (
      form.first_name !== "" ||
      form.middle_name !== "" ||
      form.last_name !== "" ||
      form.suffix !== "" ||
      form.email !== "" ||
      form.role !== "Admin" ||
      form.policy !== ""
    );
  };

  const handleRequestClose = () => {
    if (hasChanges()) {
      setConfirmClose(true);
    } else {
      handleClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    const missingFields = [];
    if (!form.first_name.trim()) missingFields.push("First Name");
    if (!form.last_name.trim()) missingFields.push("Last Name");

    if (!isEdit) {
      if (!form.email.trim()) missingFields.push("Email");
    }

    if (missingFields.length > 0) {
      setLocalError(`Please fill in all required fields: ${missingFields.join(", ")}.`);
      return;
    }

    if (isEdit && editData) {
      if (!hasChanges()) {
        setLocalError("No changes were made.");
        return;
      }
    }

    // Build payload — map role name back to role_id for the API.
    // Status is never sent on create — the server always sets it to
    // "Pending Activation" (AdminUserService::create()). On edit it's
    // still sent, since Activated/Deactivated toggling is a normal part
    // of managing an already-linked account.
    const payload = {
      email: form.email,
      role_id: ROLE_TO_ID[form.role],
      first_name: form.first_name,
      middle_name: form.middle_name || undefined,
      last_name: form.last_name,
      suffix: form.suffix || undefined,
    };

    if (isEdit) {
      payload.status = form.status;
    }

    // Policy attachment only applies to new admins (role_id 3) — super
    // admins always have full access, and editing an existing user's
    // policy goes through the separate "Manage Access" flow instead.
    if (!isEdit && form.role === "Admin" && form.policy) {
      const policy = systemPolicies.find((p) => p.name === form.policy);
      if (policy) payload.policy_id = policy.policy_id;
    }

    onSubmit?.(payload, editData?.user_id);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setLocalError("");
    setConfirmClose(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-9999 flex justify-center items-center p-4">
        <div className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/50'}`} onClick={handleRequestClose} />

        <div className={`relative rounded-2xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-32px)] overflow-hidden flex flex-col ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white'}`}>

          {/* Header */}
          <div className={`px-6 py-5 flex items-center justify-between ${isDark ? 'bg-[#2a2a2f] border-b border-[#3e4042]' : 'bg-pup-dark-maroon'}`}>
            <div>
              <h2 className="text-white font-bold text-lg uppercase tracking-wide">
                {isEdit ? "Edit User" : "Add New User"}
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#b0b3b8]' : 'text-white/60'}`}>
                {isEdit ? "Update the user details below" : "Fill in the details below"}
              </p>
            </div>
            <button type="button" onClick={handleRequestClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="h-1 w-full bg-linear-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
            <div className={`px-6 py-6 space-y-4 flex-1 overflow-y-auto ${isDark ? 'text-[#e4e6eb]' : ''}`}>

              {/* Name Fields (First, Last, Middle, Suffix) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <InputGroup label="First Name" name="first_name" value={form.first_name}
                  onChange={handleChange} placeholder="e.g. Juan" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Last Name" name="last_name" value={form.last_name}
                  onChange={handleChange} placeholder="e.g. dela Cruz" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Middle Name" name="middle_name" value={form.middle_name}
                  onChange={handleChange} placeholder="e.g. Santos" labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                <InputGroup label="Suffix" name="suffix" value={form.suffix}
                  onChange={handleChange} placeholder="e.g. Jr., Sr." labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
              </div>

              {/* Email — create only shows the plain email field; edit
                  shows email alongside Status (the only field on the edit
                  form that toggles an already-linked account live/inactive). */}
              {!isEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <InputGroup label="Email" name="email" type="email" value={form.email}
                    onChange={handleChange} placeholder="e.g. juan@pup.edu.ph" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                </div>
              )}

              {isEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <InputGroup label="Email" name="email" type="email" value={form.email}
                    onChange={handleChange} placeholder="e.g. juan@pup.edu.ph" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                  <DropDown label="Status" name="status" value={form.status}
                    onChange={handleChange} options={STATUS_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
                </div>
              )}

              {/* Role — always shown. Status is edit-only (above); on
                  create it's always server-set to "Pending Activation". */}
              <div className="grid grid-cols-2 gap-3">
                <DropDown label="Role" name="role" value={form.role}
                  onChange={handleChange} options={ROLE_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
              </div>

              {/* Policy attachment — new admins only. Super admins have
                  full access by default, and existing admins already have
                  a dedicated "Manage Access" action for this. */}
              {!isEdit && form.role === "Admin" && (
                <div>
                  <DropDown
                    label="Attach Policy"
                    name="policy"
                    value={form.policy}
                    onChange={handleChange}
                    options={systemPolicies.map((p) => p.name)}
                    labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}
                  />
                  <p className={`text-xs mt-1 ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>
                    Optional — determines which modules this admin can access. Leave blank to attach one later from Manage Access.
                  </p>
                </div>
              )}

              {/* Pending-activation hint — create only. No password is set
                  here; the account can't log in until it's linked to a
                  real IdP identity on first SSO login. */}
              {!isEdit && (
                <p className={`text-xs rounded-lg px-3 py-2.5 border ${isDark ? 'bg-[#1f1f1f] border-[#3e4042] text-[#9a9a9a]' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  This creates a pending RIS record. The person must also be given a matching System Administrator account in the IdP&apos;s User Pool before they can log in.
                </p>
              )}

            </div>

            {/* Footer */}
            <div className={`px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
              <button type="button" onClick={handleRequestClose}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${isDark ? 'text-[#b0b3b8] hover:bg-[#2a2a2f]' : 'text-gray-600 hover:bg-gray-100'}`}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow disabled:opacity-60 ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}>
                {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
              </button>
            </div>
          </form>
        </div>
        <ConfirmationModal
          isOpen={confirmClose}
          onClose={() => setConfirmClose(false)}
          onConfirm={handleClose}
          title="Discard Changes?"
          message="Are you sure you want to close? Any unsaved changes will be lost."
          type="confirm"
        />
      </div>
      <ErrorToast message={localError} onClose={() => setLocalError("")} />
    </>
  );
};

export default UserModal;