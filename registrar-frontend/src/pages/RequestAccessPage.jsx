import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthProvider";
import { useAlertToast } from "../context/AlertToastContext";
import { getMyAccessRequests, submitAccessRequest, getPolicies } from "../services/api";
import InputGroup from "../components/InputGroup";
import DropDown from "../components/DropDown";

const ROLE_OPTIONS = ["Admin", "Super Admin"];
const ROLE_TO_ID = { "Admin": 3, "Super Admin": 4 };

const EMPTY_FORM = {
  target_first_name: "",
  target_last_name: "",
  target_email: "",
  requested_role: "Admin",
  requested_policy: "",
  justification: "",
};

const STATUS_BADGE = {
  Requested: "bg-amber-100 text-amber-700 border-amber-200",
  Approved:  "bg-blue-100 text-blue-700 border-blue-200",
  Rejected:  "bg-red-100 text-red-700 border-red-200",
  Fulfilled: "bg-green-100 text-green-700 border-green-200",
  Expired:   "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_BADGE_DARK = {
  Requested: "bg-amber-900/20 text-amber-400 border-amber-600",
  Approved:  "bg-blue-900/20 text-blue-400 border-blue-600",
  Rejected:  "bg-red-950/30 text-red-400 border-red-700",
  Fulfilled: "bg-green-900/20 text-green-400 border-green-600",
  Expired:   "bg-gray-700/20 text-gray-300 border-gray-400",
};

/**
 * Self-service "Request Access" page — reachable at /staff/access-requests,
 * gated by the 'access_requests' module (see App.jsx / ModuleRoute).
 *
 * Any admin who can see this page can submit a request, but can never
 * create a SystemUser directly — only a Super Admin approving the
 * request does that (AccessRequestService::approve()).
 *
 * GET /access-requests (the full queue) is Super Admin only, but every
 * admin/super-admin can see their own submission history via
 * GET /access-requests/mine (AccessRequestPolicy::viewOwn) — hard-scoped
 * server-side to the caller, so it's safe to call for any role that can
 * reach this page.
 */
const RequestAccessPage = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useAlertToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [policies, setPolicies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState(null); // null = not available for this role

  useEffect(() => {
    getPolicies()
      .then((res) => setPolicies(res.data?.data ?? res.data ?? []))
      .catch(() => setPolicies([]));

    // Available to any admin/super-admin — server-side scoped to the
    // caller's own requests regardless of role (AccessRequestPolicy::viewOwn).
    if (user) {
      getMyAccessRequests()
        .then((res) => setMyRequests(res.data?.data ?? []))
        .catch(() => setMyRequests(null));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!form.target_first_name.trim() || !form.target_last_name.trim() || !form.target_email.trim() || !form.justification.trim()) {
      showError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const policy = policies.find((p) => p.name === form.requested_policy);

      await submitAccessRequest({
        target_first_name: form.target_first_name,
        target_last_name:  form.target_last_name,
        target_email:      form.target_email,
        requested_role_id: ROLE_TO_ID[form.requested_role],
        requested_policy_id: policy?.policy_id,
        justification: form.justification,
      });

      showSuccess("Access request submitted. A Super Admin will review it shortly.");
      setForm(EMPTY_FORM);
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to submit the access request.");
    } finally {
      setSubmitting(false);
    }
  }, [form, policies, showError, showSuccess]);

  return (
    <div className={`font-sans ${isDark ? 'text-[#e4e6eb]' : ''}`}>
      <div className={`rounded-2xl p-4 sm:p-6 max-w-3xl mx-auto ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white shadow-md border border-gray-200/80'}`}>
        <h2 className="font-bold text-lg mb-1">Request Access</h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
          Submit a request for a new Admin or Super Admin account. A Super Admin will review and, if approved, a pending RIS record is created — the person still needs a matching System Administrator account created for them in the IdP separately.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputGroup label="First Name" name="target_first_name" value={form.target_first_name}
              onChange={handleChange} placeholder="e.g. Juan" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
            <InputGroup label="Last Name" name="target_last_name" value={form.target_last_name}
              onChange={handleChange} placeholder="e.g. dela Cruz" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
          </div>

          <InputGroup label="Email" name="target_email" type="email" value={form.target_email}
            onChange={handleChange} placeholder="e.g. juan@pup.edu.ph" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DropDown label="Requested Role" name="requested_role" value={form.requested_role}
              onChange={handleChange} options={ROLE_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
            {form.requested_role === "Admin" && (
              <DropDown label="Requested Policy (optional)" name="requested_policy" value={form.requested_policy}
                onChange={handleChange} options={policies.map((p) => p.name)} labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-600'} />
            )}
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-600'}`}>
              Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              name="justification"
              value={form.justification}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Why does this person need access, and to what?"
              className={`w-full rounded-lg px-3 py-2 text-sm border outline-none focus:ring-2 ${isDark
                ? 'bg-[#1c1c1e] border-[#3e4042] text-[#e4e6eb] focus:ring-yellow-500/40'
                : 'bg-white border-gray-300 text-gray-900 focus:ring-pup-dark-maroon/30'}`}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all shadow disabled:opacity-60 ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>

      {myRequests !== null && (
        <div className={`rounded-2xl p-4 sm:p-6 max-w-3xl mx-auto mt-6 ${isDark ? 'bg-[#242526] border border-[#3e4042]' : 'bg-white shadow-md border border-gray-200/80'}`}>
          <h3 className="font-bold text-base mb-4">Recent Access Requests</h3>
          {myRequests.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>No access requests yet.</p>
          ) : (
            <div className="space-y-2">
              {myRequests.map((r) => (
                <div key={r.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isDark ? 'border-[#3e4042]' : 'border-gray-100'}`}>
                  <div>
                    <p className="text-sm font-semibold">{r.target_first_name} {r.target_last_name}</p>
                    <p className={`text-xs ${isDark ? 'text-[#9a9a9a]' : 'text-gray-400'}`}>{r.target_email} · {r.requested_role}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${isDark ? STATUS_BADGE_DARK[r.status] : STATUS_BADGE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestAccessPage;