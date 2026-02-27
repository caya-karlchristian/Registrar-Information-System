import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading user...</div>;
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role_id)) {
    return <div className="p-6 text-center text-red-600 font-bold">Access Denied</div>;
  }

  return children;
};

export default ProtectedRoute;