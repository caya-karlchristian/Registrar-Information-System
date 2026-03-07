import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';

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
  const { user, loading } = useAuth();

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
    return <Navigate to="/forbidden" state={{ reason: "unauthenticated" }} replace />;
  }

  // Logged in but wrong role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role_name)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
};

export default ProtectedRoute;