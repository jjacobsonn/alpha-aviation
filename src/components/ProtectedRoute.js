import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children }) => {
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

	return children;
};

export default ProtectedRoute;