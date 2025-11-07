import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const NotFound = () => {
	const navigate = useNavigate();

	return (
		<Container maxWidth="md">
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					minHeight: '100vh',
					textAlign: 'center',
				}}
			>
				<ErrorOutlineIcon
					sx={{ fontSize: 120, color: 'primary.main', mb: 2 }}
				/>
				<Typography variant="h2" gutterBottom>
					404
				</Typography>
				<Typography variant="h5" color="text.secondary" gutterBottom>
					Page Not Found
				</Typography>
				<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
					The page you're looking for doesn't exist or has been moved.
				</Typography>
				<Button
					variant="contained"
					size="large"
					onClick={() => navigate('/')}
				>
					Go to Login
				</Button>
			</Box>
		</Container>
	);
};

export default NotFound;