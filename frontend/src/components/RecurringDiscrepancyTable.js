import React, { useState, useEffect, useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Link,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { makeApiRequest } from '../shared/Api';
import ScrollableTableContainer from './ScrollableTableContainer';

const fetchRecurringDiscrepancies = async () => {
	try {
		const response = await makeApiRequest('GET', '/management/dashboard/');
		const analytics = response.aircraft_analytics || {};
		return (
			analytics.recurring_discrepancies ||
			analytics.recuring_discrepancies ||
			[]
		);
	} catch (error) {
		console.error('Error fetching recurring discrepancies:', error);
		return [];
	}
};

/** Supports legacy dict `[count, tails]` and new list payloads from the API. */
function normalizeRows(raw) {
	if (Array.isArray(raw)) {
		return raw
			.map((row) => ({
				ata_code: row.ata_code || '—',
				count: row.count ?? 0,
				aircraft_tails: row.aircraft_tails || [],
				aircraft: row.aircraft || [],
				sample_description: row.sample_description || '',
				discrepancy_ids: row.discrepancy_ids || [],
			}))
			.sort((a, b) => b.count - a.count || a.ata_code.localeCompare(b.ata_code));
	}
	if (!raw || typeof raw !== 'object') return [];
	return Object.entries(raw)
		.map(([ata_code, value]) => {
			const count = Array.isArray(value) ? value[0] : 0;
			const tails = Array.isArray(value?.[1]) ? value[1] : [];
			return {
				ata_code,
				count,
				aircraft_tails: tails,
				aircraft: tails.map((t) => ({ id: null, registration_number: t })),
				sample_description: '',
				discrepancy_ids: [],
			};
		})
		.sort((a, b) => b.count - a.count || a.ata_code.localeCompare(b.ata_code));
}

function maintenancePathForRow(row) {
	const firstDisc = row.discrepancy_ids?.[0];
	if (firstDisc) return `/maintenance?disc=${firstDisc}`;
	return `/maintenance?ata=${encodeURIComponent(row.ata_code)}`;
}

export default function RecurringDiscrepancyTable() {
	const navigate = useNavigate();
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchRecurringDiscrepancies()
			.then((data) => {
				setRows(normalizeRows(data));
				setLoading(false);
			})
			.catch(() => {
				setError('Failed to load recurring discrepancies.');
				setLoading(false);
			});
	}, []);

	const totalEvents = useMemo(() => rows.reduce((s, r) => s + (r.count || 0), 0), [rows]);

	return (
		<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: '100%' }}>
			<CardContent sx={{ p: { xs: 2, sm: 3 } }}>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					justifyContent="space-between"
					alignItems={{ xs: 'flex-start', sm: 'center' }}
					spacing={1}
					sx={{ mb: 1 }}
				>
					<Box>
						<Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.6 }}>
							Recurring discrepancies
						</Typography>
						<Typography variant="body2" color="text.secondary">
							ATA chapters that show up more than once in your discrepancy log (read-only summary).
						</Typography>
					</Box>
					<Button
						size="small"
						component={RouterLink}
						to="/analytics"
						endIcon={<OpenInNewIcon />}
						sx={{ flexShrink: 0 }}
					>
						Full analytics
					</Button>
				</Stack>
				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
					Click a row to open matching records in Maintenance. ATA codes are industry chapter numbers (e.g. 33 =
					lights, 74 = ignition). This table is not editable here — edit individual discrepancies on the
					Maintenance page.
				</Typography>

				{loading ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
						<CircularProgress color="primary" size={28} />
					</Box>
				) : error ? (
					<Typography color="error">{error}</Typography>
				) : (
					<ScrollableTableContainer fill minWidth={640}>
						<Table
							size="small"
							sx={{
								'& .MuiTableCell-head': { bgcolor: 'action.hover', fontWeight: 700 },
								'& .MuiTableCell-root': { borderColor: 'divider' },
							}}
						>
							<TableHead>
								<TableRow>
									<TableCell sx={{ width: '14%' }}>ATA code</TableCell>
									<TableCell sx={{ width: '32%' }}>Typical issue</TableCell>
									<TableCell sx={{ width: '12%' }} align="right">
										Count
									</TableCell>
									<TableCell>Tails affected</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.length === 0 ? (
									<TableRow>
										<TableCell colSpan={4} align="center">
											No recurring ATA patterns in your discrepancy history.
										</TableCell>
									</TableRow>
								) : (
									rows.map((row) => (
										<TableRow
											key={row.ata_code}
											hover
											sx={{ cursor: 'pointer' }}
											onClick={() => navigate(maintenancePathForRow(row))}
										>
											<TableCell>
												<Link
													component={RouterLink}
													to={maintenancePathForRow(row)}
													underline="hover"
													sx={{ fontWeight: 700 }}
													onClick={(e) => e.stopPropagation()}
												>
													{row.ata_code}
												</Link>
											</TableCell>
											<TableCell
												color="text.secondary"
												sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
											>
												{row.sample_description || (
													<Typography component="span" variant="body2" color="text.disabled">
														No description on file
													</Typography>
												)}
											</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600 }}>
												{row.count}
											</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<Stack direction="row" flexWrap="wrap" gap={0.5}>
													{(row.aircraft?.length ? row.aircraft : row.aircraft_tails.map((t) => ({
														id: null,
														registration_number: t,
													}))).map((ac) => {
														const tail = ac.registration_number || ac;
														const id = ac.id;
														return id ? (
															<Chip
																key={tail}
																label={tail}
																size="small"
																variant="outlined"
																component={RouterLink}
																to={`/fleet/${id}`}
																clickable
															/>
														) : (
															<Chip key={tail} label={tail} size="small" variant="outlined" />
														);
													})}
												</Stack>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</ScrollableTableContainer>
				)}
				{!loading && rows.length > 0 ? (
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
						{rows.length} ATA pattern{rows.length === 1 ? '' : 's'} · {totalEvents} total discrepancy
						events grouped above
					</Typography>
				) : null}
			</CardContent>
		</Card>
	);
}
