import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRoles = [], requiredPermissions = {} }) => {
  const { authenticated, loading, roles, permissions } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Keycloak will handle redirect
  }

  // Check for required roles
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requiredRoles.some(role => roles.includes(role));
    if (!hasRequiredRoles) {
      return (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      );
    }
  }

  // Check for required permissions
  if (requiredPermissions.canDownload && !permissions.canDownload) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have download permission.</p>
      </div>
    );
  }

  if (requiredPermissions.canDelete && !permissions.canDelete) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have delete permission.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
