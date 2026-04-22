import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles, requirePlatformAdmin = false }) => {
  const { state } = useAppContext();
  const location = useLocation();
  const realUser = state.user;
  const isPlatformAdmin = Boolean(realUser?.isStaff || realUser?.isSuperuser);
  const effectiveRole = state.viewAsUser?.role || realUser?.role;

  if (!state.initialized) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requirePlatformAdmin) {
    if (!isPlatformAdmin) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
		(!effectiveRole || !allowedRoles.includes(effectiveRole))
  ) {
    // Platform admins can access all role pages for inspection/testing.
    if (isPlatformAdmin) {
      return children;
    }

    // If role hasn't been loaded yet, wait instead of redirecting.
    // This prevents "flash then disappear" immediately after login.
    if (!effectiveRole) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    // Role is loaded but not allowed for this route.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;