import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles, requirePlatformAdmin = false }) => {
  const { state } = useAppContext();
  const location = useLocation();

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
    const isPlatformAdmin = Boolean(state.user?.isStaff || state.user?.isSuperuser);
    if (!isPlatformAdmin) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
		(!state.user?.role || !allowedRoles.includes(state.user.role))
  ) {
    // If role hasn't been loaded yet, wait instead of redirecting.
    // This prevents "flash then disappear" immediately after login.
    if (!state.user?.role) {
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