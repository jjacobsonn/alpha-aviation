import { Box } from '@mui/material';
import NavigationDrawer from './NavigationDrawer';

const Layout = ({ children }) => {
	return (
		<Box sx={{ display: 'flex', minHeight: '100vh' }}>
			<NavigationDrawer />
			<Box
				component="main"
				sx={{
					flexGrow: 1,
					minWidth: 0,
					width: '100%',
					bgcolor: 'background.default',
					overflow: 'auto',
				}}
			>
				{children}
			</Box>
		</Box>
	);
};

export default Layout;
