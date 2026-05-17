import { useCallback, useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import NavigationDrawer from './NavigationDrawer';
import SiteSearchDialog from './search/SiteSearchDialog';
import SiteSearchTrigger from './search/SiteSearchTrigger';

const Layout = ({ children }) => {
	const [searchOpen, setSearchOpen] = useState(false);

	const openSearch = useCallback(() => setSearchOpen(true), []);
	const closeSearch = useCallback(() => setSearchOpen(false), []);

	useEffect(() => {
		const onKeyDown = (e) => {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	return (
		<Box sx={{ display: 'flex', minHeight: '100vh' }}>
			<NavigationDrawer onOpenSearch={openSearch} />
			<Box
				component="main"
				sx={{
					flexGrow: 1,
					minWidth: 0,
					width: '100%',
					bgcolor: 'background.default',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
				}}
			>
				<Box
					component="header"
					sx={{
						position: 'sticky',
						top: 0,
						zIndex: (t) => t.zIndex.appBar - 1,
						px: { xs: 2, sm: 3 },
						py: { xs: 1.25, sm: 1.5 },
						borderBottom: '1px solid',
						borderColor: 'divider',
						bgcolor: 'background.paper',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'flex-end',
						flexShrink: 0,
					}}
				>
					<Stack direction="row" alignItems="center" spacing={1} sx={{ width: { xs: 'auto', md: '100%' }, justifyContent: 'flex-end' }}>
						<SiteSearchTrigger onOpen={openSearch} />
					</Stack>
				</Box>
				<Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{children}</Box>
			</Box>
			<SiteSearchDialog open={searchOpen} onClose={closeSearch} />
		</Box>
	);
};

export default Layout;
