import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function ForbiddenPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  const status = location.state?.status || 403;
  const reason = location.state?.reason;
  const message =
    reason === "unauthenticated"
      ? "You must be logged in to access this page."
      : reason === "policy"
      ? "This module isn't included in your account's assigned policy. Contact a super admin if you believe this is a mistake."
      : "You don't have permission to access this page.";

  // "Go to Home" only helps a logged-out visitor — for a logged-in user,
  // MainPage immediately re-routes them to ROLE_HOME, so if that role's
  // policy grants nothing, we just bounce straight back here in a loop.
  // Detect that case and offer logout instead of (or alongside) home.
  const isTrappedLoggedIn = reason === "policy" && !!user;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-white font-sans">
      <div className="flex flex-col items-center text-center gap-3">

        <h1 className="text-8xl font-extrabold" style={{ color: "#800000" }}>
          {status}
        </h1>

        <p className="text-gray-500 text-sm max-w-xs">{message}</p>

        {isTrappedLoggedIn && (
          <p className="text-gray-400 text-xs max-w-xs">
            Your account currently has no modules assigned, so there's nowhere
            for us to send you yet. Log out and ask a super admin to update
            your policy, or reload once it's fixed.
          </p>
        )}

        <div className="mt-4 flex gap-3">
          {!isTrappedLoggedIn && (
            <button
              onClick={() => navigate("/", { state: { fromForbidden: reason } })}
              className="px-6 py-2.5 text-sm rounded-lg text-white font-semibold transition-all active:scale-95"
              style={{ backgroundColor: "#800000" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#600000")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#800000")}
            >
              Go to Home
            </button>
          )}

          {!!user && (
            <button
              onClick={logout}
              disabled={isLoggingOut}
              className="px-6 py-2.5 text-sm rounded-lg font-semibold border transition-all active:scale-95 disabled:opacity-50"
              style={{ borderColor: "#800000", color: "#800000" }}
            >
              {isLoggingOut ? "Logging out…" : "Log out"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}