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
		<Stack spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
			{rows.map((row, index) => {
				const pct = Math.min(100, (row.value / maxVal) * 100);
				const valueLine = `${valueFormatter(row.value)}${row.sublabel ? ` · ${row.sublabel}` : ''}`;
				return (
					<Box key={`${row.label}-${index}`} sx={{ minWidth: 0, width: '100%' }}>
						<Stack
							direction={{ xs: 'column', sm: 'row' }}
							spacing={{ xs: 0.25, sm: 1 }}
							justifyContent="space-between"
							alignItems={{ xs: 'flex-start', sm: 'baseline' }}
							sx={{ mb: 0.5 }}
						>
							<Typography
								variant="body2"
								fontWeight={500}
								sx={{
									minWidth: 0,
									width: { xs: '100%', sm: 'auto' },
									maxWidth: '100%',
									wordBreak: 'break-word',
								}}
							>
								{row.label}
							</Typography>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{
									flexShrink: 0,
									maxWidth: '100%',
									wordBreak: 'break-word',
									textAlign: { xs: 'left', sm: 'right' },
								}}
							>
								{valueLine}
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
								width: '100%',
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
