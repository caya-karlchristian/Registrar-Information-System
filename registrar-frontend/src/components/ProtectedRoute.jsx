import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import AgreementPage from './AgreementPage';

// -------------------------------------------------------
// ProtectedRoute
//
// Usage:
//   <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
//     <SomePage />
//   </ProtectedRoute>
//
// allowedRoles: array of role_name strings from ROLES constant
// e.g. ["admin", "super_admin"]
// -------------------------------------------------------
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
const { user, loading, isLoggingOut, hasAgreed, setHasAgreed } = useAuth();
  // Still restoring session — don't redirect yet
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  // Not logged in
 if (!user) {
  return isLoggingOut
    ? <Navigate to="/" replace />
    : <Navigate to="/forbidden" state={{ reason: "unauthenticated" }} replace />;
}

  // Logged in but wrong role. `user.role_name` now reflects the
  // session's server-enforced ASSUMED role (see AuthController::me() /
  // switchRole() and SystemUser::assumedRoleId()) — a student-staff
  // account that has switched to Admin already shows role_name: "admin"
  // here, so no separate "mid-transition" bypass is needed anymore.
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role_name)) {
    return <Navigate to="/forbidden" replace />;
  }

  if (localStorage.getItem(`neverShowAgreement_${user.user_id}`) === "true") {
    return children;
  }

  // Show agreement page if not yet agreed
  if (!hasAgreed) {
    return (
      <>
        {children}  {/* renders the page behind */}
        <AgreementPage />
      </>
  );
  }
  return children; 
}

export default ProtectedRoute;