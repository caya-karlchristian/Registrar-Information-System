import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { hasModuleAccess } from "../utils/policy";

// -------------------------------------------------------
// ModuleRoute
//
// Sits *inside* an already-role-protected route tree (i.e. always
// nested under a <ProtectedRoute allowedRoles={[...]}>) and adds a
// finer-grained check: does this specific admin's assigned policy
// grant the given module?
//
// Usage:
//   <Route path="analytics" element={
//     <ModuleRoute module={MODULE_KEYS.ANALYTICS}>
//       <AnalyticsDashboard />
//     </ModuleRoute>
//   } />
//
// This is a UX convenience (redirect before an API call would 403
// anyway) — the backend's EnsureModuleAccess middleware is the actual
// security boundary. See src/utils/policy.js for details.
// -------------------------------------------------------
const ModuleRoute = ({ module, children }) => {
  const { user, loading } = useAuth();

  // Auth is still resolving (e.g. hard refresh) — ProtectedRoute above
  // us already renders the loading state, but guard against a flash of
  // "forbidden" before `user` is populated.
  if (loading) return null;

  if (!hasModuleAccess(user, module)) {
    return <Navigate to="/forbidden" state={{ reason: "policy" }} replace />;
  }

  return children;
};

export default ModuleRoute;
