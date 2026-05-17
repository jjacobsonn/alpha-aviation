import React from 'react';
import { Box, Button, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

function shortcutLabel() {
	if (typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)) {
		return '⌘K';
	}
	return 'Ctrl+K';
}

export default function SiteSearchTrigger({ onOpen, compact = false }) {
	const theme = useTheme();
	const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

	if (compact || isNarrow) {
		return (
			<Tooltip title={`Search (${shortcutLabel()})`}>
				<IconButton
					size="small"
					onClick={onOpen}
					aria-label="Open search"
					sx={{ color: 'text.secondary' }}
				>
					<SearchIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		);
	}

	return (
		<Button
			variant="outlined"
			size="small"
			onClick={onOpen}
			startIcon={<SearchIcon fontSize="small" />}
			aria-label="Open search"
			sx={{
				justifyContent: 'flex-start',
				color: 'text.secondary',
				borderColor: 'divider',
				bgcolor: 'action.hover',
				textTransform: 'none',
				minWidth: 200,
				maxWidth: 320,
				px: 1.5,
				py: 0.75,
				'&:hover': { bgcolor: 'action.selected', borderColor: 'divider' },
			}}
		>
			<Box component="span" sx={{ flex: 1, textAlign: 'left', typography: 'body2' }}>
				Search…
			</Box>
			<Box
				component="kbd"
				sx={{
					typography: 'caption',
					color: 'text.disabled',
					border: '1px solid',
					borderColor: 'divider',
					borderRadius: 0.75,
					px: 0.75,
					py: 0.25,
					lineHeight: 1.2,
					fontFamily: 'inherit',
				}}
			>
				{shortcutLabel()}
			</Box>
		</Button>
	);
}
