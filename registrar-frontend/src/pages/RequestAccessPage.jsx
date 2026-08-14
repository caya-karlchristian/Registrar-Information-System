import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthProvider";
import { getMyAccessRequests, submitAccessRequest, getPolicies } from "../services/api";
import InputGroup from "../components/InputGroup";
import DropDown from "../components/DropDown";
import SuccessToast from "../components/SuccessToast.jsx";
import ErrorToast from "../components/ErrorToast.jsx";
import { UserIcon } from "@heroicons/react/24/outline";

const ROLE_OPTIONS = ["Admin", "Super Admin"];
const ROLE_TO_ID = { "Admin": 3, "Super Admin": 4 };

const EMPTY_FORM = {
  target_first_name: "",
  target_middle_name: "",
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

  const [form, setForm] = useState(EMPTY_FORM);
  const [policies, setPolicies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState(null); // null = not available for this role
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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

    const firstName = form.target_first_name.trim();
    const lastName = form.target_last_name.trim();
    const email = form.target_email.trim();
    const justification = form.justification.trim();

    if (!firstName || !lastName || !email || !justification) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const policy = policies.find((p) => p.name === form.requested_policy);

      await submitAccessRequest({
        target_first_name: form.target_first_name,
        target_middle_name: form.target_middle_name,
        target_last_name:  form.target_last_name,
        target_email:      form.target_email,
        requested_role_id: ROLE_TO_ID[form.requested_role],
        requested_policy_id: policy?.policy_id,
        justification: form.justification,
      });

      setSuccessMsg("Access request submitted. A Super Admin will review it shortly.");
      setForm(EMPTY_FORM);
      
      // Reload submission history
      if (user) {
        getMyAccessRequests()
          .then((res) => setMyRequests(res.data?.data ?? []))
          .catch(() => {});
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to submit the access request.");
    } finally {
      setSubmitting(false);
    }
  }, [form, policies, user]);

  return (
    <div className="w-full flex flex-col font-sans">
      <div className={`rounded-2xl p-4 sm:p-6 ${
        isDark 
          ? 'bg-[#242526] text-[#e4e6eb] border border-[#3e4042]' 
          : 'bg-white text-gray-900 shadow-md border border-gray-200/80'
      }`}>
        
        {/* Info Header */}
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-[#3e4042] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className={`font-bold text-xl sm:text-2xl ${isDark ? 'text-white' : 'text-pup-dark-maroon'}`}>
              Request Access
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
              Submit a request for a new Admin or Super Admin account. A Super Admin will review and approve submissions.
            </p>
          </div>
        </div>

        <div className="w-full flex flex-col lg:flex-row gap-6 sm:gap-8 items-start lg:items-stretch">
          
          {/* Left Panel: Recent Requests history */}
          {myRequests !== null && (
            <div className="w-full lg:w-96 shrink-0 flex flex-col self-stretch">
              <div className={`rounded-xl flex-1 overflow-hidden shadow-sm flex flex-col border ${
                isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-gray-50 border border-gray-200/50'
              }`}>
                <div className="px-6 py-4 border-b dark:border-[#3e4042] flex justify-between items-center">
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Recent Requests
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-500">
                    Total: {myRequests.length}
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[450px] custom-scrollbar">
                  {myRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <UserIcon className={`w-12 h-12 mb-3 opacity-30 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} />
                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>No Requests Yet</h3>
                      <p className={`text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>Your submitted requests will appear here.</p>
                    </div>
                  ) : (
                    myRequests.map((r) => (
                      <div
                        key={r.id}
                        className={`rounded-xl p-4 transition-all duration-200 border flex items-start justify-between gap-3 ${
                          isDark
                            ? 'bg-[#18191a] border-[#2c2d30] hover:border-[#3e4042] hover:bg-[#242526]'
                            : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm font-bold truncate ${isDark ? 'text-[#e4e6eb]' : 'text-gray-800'}`}>
                            {[r.target_first_name, r.target_middle_name, r.target_last_name].filter(Boolean).join(" ")}
                          </h4>
                          <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                            {r.target_email}
                          </p>
                          <p className={`text-[10px] mt-1 font-semibold ${isDark ? 'text-gray-500' : 'text-gray-450'}`}>
                            Role: {r.requested_role}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${isDark ? STATUS_BADGE_DARK[r.status] : STATUS_BADGE[r.status]}`}>
                          {r.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Right Panel: Form */}
          <div className="w-full lg:flex-1 flex flex-col">
            <div className={`rounded-xl p-6 sm:p-8 border shadow-sm flex-1 flex flex-col justify-between ${
              isDark ? 'bg-[#1f1f1f] border-[#3e4042]' : 'bg-gray-50 border border-gray-200/50'
            }`}>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 flex-1">
                <div>
                  <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Submit Request
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-500'}`}>
                    Provide details below to submit a request for a new Admin or Super Admin account.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <InputGroup label="First Name" name="target_first_name" value={form.target_first_name}
                      onChange={handleChange} placeholder="e.g. Juan" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-650'} />
                    <InputGroup label="Middle Name" name="target_middle_name" value={form.target_middle_name}
                      onChange={handleChange} placeholder="e.g. Santos" labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-650'} />
                    <InputGroup label="Last Name" name="target_last_name" value={form.target_last_name}
                      onChange={handleChange} placeholder="e.g. dela Cruz" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-655'} />
                  </div>

                  <InputGroup label="Email" name="target_email" type="email" value={form.target_email}
                    onChange={handleChange} placeholder="e.g. juan@pup.edu.ph" required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-650'} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DropDown label="Requested Role" name="requested_role" value={form.requested_role}
                      onChange={handleChange} options={ROLE_OPTIONS} required labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-650'} />
                    {form.requested_role === "Admin" && (
                      <DropDown label="Requested Policy (optional)" name="requested_policy" value={form.requested_policy}
                        onChange={handleChange} options={policies.map((p) => p.name)} labelColor={isDark ? 'text-[#b0b3b8]' : 'text-gray-650'} />
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-650'}`}>
                      Justification <span className={isDark ? 'text-[#FFC72C] ml-1' : 'text-red-400 ml-1'}>*</span>
                    </label>
                    <textarea
                      name="justification"
                      value={form.justification}
                      onChange={handleChange}
                      required
                      rows={4}
                      placeholder="Why does this person need access, and to what?"
                      className={`w-full px-3 py-3 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FFC72C] ${isDark
                        ? 'bg-[#1f1f1f] text-[#e4e6eb] border border-[#3e4042] placeholder:text-[#8f949d]'
                        : 'bg-white text-gray-700 border border-gray-200 placeholder:text-gray-400'}`}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-[#3e4042] mt-4">
                  {(form.target_first_name || form.target_last_name || form.target_email || form.justification) && (
                    <button
                      type="button"
                      onClick={() => setForm(EMPTY_FORM)}
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors mr-3 cursor-pointer ${
                        isDark 
                          ? 'text-[#b0b3b8] border-[#3e4042] hover:bg-[#2a2a2f]' 
                          : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Clear
                    </button>
                  )}
                  <button type="submit" disabled={submitting}
                    className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all shadow cursor-pointer ${isDark ? 'bg-[#2a2a2f] text-[#e4e6eb] hover:bg-[#353539] border border-[#3e4042]' : 'bg-pup-dark-maroon text-white hover:bg-[#3a0303]'}`}>
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* Direct Success and Error toasts */}
      <SuccessToast message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg("")} />
    </div>
  );
};

export default RequestAccessPage;