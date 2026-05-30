import React from 'react';
import { TableContainer } from '@mui/material';

/**
 * Horizontal scroll wrapper for wide data tables (especially mobile).
 * Applies minWidth on the child Table so columns are not squashed on narrow viewports.
 * Parent layouts should use minWidth: 0 so flex children can shrink.
 *
 * @param {boolean} fill - When true, table stretches to 100% of the container on md+;
 *   below md, keeps minWidth + horizontal scroll.
 */
export default function ScrollableTableContainer({
	children,
	minWidth = 720,
	fill = false,
	sx,
}) {
	const child = React.Children.only(children);
	const tableSx = child.props.sx;

	const widthSx = fill
		? {
				width: '100%',
				tableLayout: 'fixed',
				minWidth: { xs: minWidth, md: '100%' },
				maxWidth: '100%',
			}
		: {
				minWidth,
				width: 'max-content',
				maxWidth: 'none',
			};

	return (
		<TableContainer
			sx={{
				width: '100%',
				maxWidth: '100%',
				minWidth: 0,
				overflowX: 'auto',
				overflowY: 'hidden',
				WebkitOverflowScrolling: 'touch',
				overscrollBehaviorX: 'contain',
				// Allow horizontal pan inside vertically scrollable page layouts (iOS).
				touchAction: 'pan-x pan-y',
				...sx,
			}}
		>
			{React.cloneElement(child, {
				sx: [widthSx, ...(Array.isArray(tableSx) ? tableSx : tableSx ? [tableSx] : [])],
			})}
		</TableContainer>
	);
}
