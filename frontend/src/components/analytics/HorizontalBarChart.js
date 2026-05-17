import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

/**
 * Accessible horizontal bar chart without external chart libs.
 * @param {{ rows: { label: string, value: number, sublabel?: string, color?: string, max?: number }[], valueFormatter?: (n: number) => string, emptyMessage?: string }} props
 */
export default function HorizontalBarChart({
	rows = [],
	valueFormatter = (n) => String(n),
	emptyMessage = 'No data for this period.',
}) {
	if (!rows.length) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
				{emptyMessage}
			</Typography>
		);
	}

	const maxVal = Math.max(...rows.map((r) => r.max ?? r.value), 1);

	return (
		<Stack spacing={1.5}>
			{rows.map((row) => {
				const pct = Math.min(100, (row.value / maxVal) * 100);
				return (
					<Box key={row.label}>
						<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
							<Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: '55%' }}>
								{row.label}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{valueFormatter(row.value)}
								{row.sublabel ? ` · ${row.sublabel}` : ''}
							</Typography>
						</Stack>
						<Box
							role="img"
							aria-label={`${row.label}: ${valueFormatter(row.value)}`}
							sx={{
								height: 8,
								borderRadius: 1,
								bgcolor: 'action.hover',
								overflow: 'hidden',
							}}
						>
							<Box
								sx={{
									height: '100%',
									width: `${pct}%`,
									borderRadius: 1,
									bgcolor: row.color || 'primary.main',
									transition: 'width 0.35s ease',
								}}
							/>
						</Box>
					</Box>
				);
			})}
		</Stack>
	);
}
