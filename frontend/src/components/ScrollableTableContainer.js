import React from 'react';
import { TableContainer } from '@mui/material';

/**
 * Horizontal scroll wrapper for wide data tables.
 * Applies minWidth on the child Table (same pattern as WorkOrders page).
 * Parent layouts should use minWidth: 0 so flex children can shrink.
 */
export default function ScrollableTableContainer({ children, minWidth = 720, sx }) {
	const child = React.Children.only(children);
	const tableSx = child.props.sx;

	return (
		<TableContainer
			sx={{
				width: '100%',
				maxWidth: '100%',
				minWidth: 0,
				overflowX: 'auto',
				WebkitOverflowScrolling: 'touch',
				...sx,
			}}
		>
			{React.cloneElement(child, {
				sx: [
					{ minWidth },
					...(Array.isArray(tableSx) ? tableSx : tableSx ? [tableSx] : []),
				],
			})}
		</TableContainer>
	);
}
