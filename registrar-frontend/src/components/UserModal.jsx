import { useState, useEffect } from "react";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import DropDown from "../components/DropDown";
import InputGroup from "../components/InputGroup";

// Only admin-level roles — Super Admin cannot create students/alumni
const ROLE_OPTIONS   = ["Admin", "Super Admin"];
const STATUS_OPTIONS = ["Activated", "Deactivated"];

const ROLE_TO_ID = { "Admin": 3, "Super Admin": 4 };
const ID_TO_ROLE = { 3: "Admin", 4: "Super Admin" };

const EMPTY_FORM = {
  first_name:  "",
  middle_name: "",
  last_name:   "",
  suffix:      "",
  email:       "",
  password:    "",
  role:        "Admin",
  status:      "Activated",
};

const UserModal = ({ isOpen, onClose, onSubmit, editData = null, submitting = false }) => {
  const isEdit = !!editData;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isEdit && editData) {
      const profile = editData.admin_profile || {};
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        first_name:  profile.first_name  || "",
        middle_name: profile.middle_name || "",
        last_name:   profile.last_name   || "",
        suffix:      profile.suffix      || "",
        email:       editData.email      || "",
        password:    "",
        role:        ID_TO_ROLE[editData.role_id] || "Admin",
        status:      editData.status     || "Activated",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setShowPassword(false);
  }, [editData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build payload — map role name back to role_id for the API
    const payload = {
      email:       form.email,
      role_id:     ROLE_TO_ID[form.role],
      status:      form.status,
      first_name:  form.first_name,
      middle_name: form.middle_name || undefined,
      last_name:   form.last_name,
      suffix:      form.suffix      || undefined,
    };

    // Only include password if it was filled in
    if (form.password) {
      payload.password = form.password;
    }

    onSubmit?.(payload, editData?.user_id);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-pup-dark-maroon px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg uppercase tracking-wide">
              {isEdit ? "Edit User" : "Add New User"}
            </h2>
            <p className="text-white/60 text-xs mt-0.5">
              {isEdit ? "Update the user details below" : "Fill in the details below"}
            </p>
          </div>
          <button type="button" onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1 w-full bg-gradient-to-r from-[#FFD700] via-[#FFC72C] to-[#FFD700]" />

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <InputGroup label="First Name" name="first_name" value={form.first_name}
                onChange={handleChange} placeholder="e.g. Juan" required labelColor="text-gray-600" />
              <InputGroup label="Last Name" name="last_name" value={form.last_name}
                onChange={handleChange} placeholder="e.g. dela Cruz" required labelColor="text-gray-600" />
            </div>

            {/* Middle Name & Suffix */}
            <div className="grid grid-cols-2 gap-3">
              <InputGroup label="Middle Name" name="middle_name" value={form.middle_name}
                onChange={handleChange} placeholder="e.g. Santos" labelColor="text-gray-600" />
              <InputGroup label="Suffix" name="suffix" value={form.suffix}
                onChange={handleChange} placeholder="e.g. Jr., Sr." labelColor="text-gray-600" />
            </div>

            {/* Email */}
            <InputGroup label="Email" name="email" type="email" value={form.email}
              onChange={handleChange} placeholder="e.g. juan@pup.edu.ph" required labelColor="text-gray-600" />

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Password {!isEdit && <span className="text-red-400 ml-1">*</span>}
                {isEdit && <span className="text-gray-400 text-xs ml-1">(leave blank to keep current)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={isEdit ? "Leave blank to keep current" : "Enter password"}
                  required={!isEdit}
                  className="w-full px-3 py-3 bg-white rounded-lg text-sm text-gray-700 shadow-sm
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFC72C]
                    transition-all duration-200 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role & Status */}
            <div className="grid grid-cols-2 gap-3">
              <DropDown label="Role" name="role" value={form.role}
                onChange={handleChange} options={ROLE_OPTIONS} required labelColor="text-gray-600" />
              <DropDown label="Status" name="status" value={form.status}
                onChange={handleChange} options={STATUS_OPTIONS} required labelColor="text-gray-600" />
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={handleClose}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 rounded-lg text-sm font-bold bg-pup-dark-maroon text-white hover:bg-[#3a0303] transition-all shadow disabled:opacity-60">
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;