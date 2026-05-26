import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Box,
	Container,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import {
	fetchAnalyticsFleetPerformance,
	fetchAnalyticsMaintenance,
	fetchCompanyAircrafts,
} from '../shared/Api';
import { useAppContext } from '../context/AppContext';
import { isPlatformAdmin } from '../shared/rbac';
import MaintenanceAnalyticsPanel from '../components/analytics/MaintenanceAnalyticsPanel';
import FleetPerformancePanel from '../components/analytics/FleetPerformancePanel';

function defaultDateRange() {
	const to = new Date();
	const from = new Date();
	from.setDate(from.getDate() - 90);
	const fmt = (d) => d.toISOString().slice(0, 10);
	return { date_from: fmt(from), date_to: fmt(to) };
}

export default function AnalyticsPage() {
	const { state } = useAppContext();
	const platformAdmin = isPlatformAdmin(state.user);
	const hasCompanyContext =
		Boolean(state.user?.companyId) || Boolean(localStorage.getItem('adminCompanyId'));

	const [range, setRange] = useState(defaultDateRange);
	const [maintFilters, setMaintFilters] = useState({
		aircraft_id: '',
		ata: '',
		group_by: 'month',
	});
	const [fleetFilters, setFleetFilters] = useState({ aircraft_id: '' });

	const [aircraft, setAircraft] = useState([]);
	const [maintenanceData, setMaintenanceData] = useState(null);
	const [fleetData, setFleetData] = useState(null);
	const [loadingMaint, setLoadingMaint] = useState(true);
	const [loadingFleet, setLoadingFleet] = useState(true);
	const [error, setError] = useState('');

	const queryBase = useMemo(
		() => ({
			date_from: range.date_from,
			date_to: range.date_to,
		}),
		[range.date_from, range.date_to],
	);

	const loadAircraft = useCallback(async () => {
		if (platformAdmin && !hasCompanyContext) return;
		try {
			const list = await fetchCompanyAircrafts();
			setAircraft(Array.isArray(list) ? list : []);
		} catch {
			setAircraft([]);
		}
	}, [platformAdmin, hasCompanyContext]);

	const loadMaintenance = useCallback(async () => {
		if (platformAdmin && !hasCompanyContext) {
			setLoadingMaint(false);
			return;
		}
		setLoadingMaint(true);
		try {
			const params = { ...queryBase, group_by: maintFilters.group_by };
			if (maintFilters.aircraft_id) params.aircraft_id = maintFilters.aircraft_id;
			if (maintFilters.ata.trim()) params.ata = maintFilters.ata.trim();
			const data = await fetchAnalyticsMaintenance(params);
			setMaintenanceData(data);
		} catch (e) {
			setError(e?.message || 'Failed to load maintenance analytics.');
		} finally {
			setLoadingMaint(false);
		}
	}, [platformAdmin, hasCompanyContext, queryBase, maintFilters]);

	const loadFleet = useCallback(async () => {
		if (platformAdmin && !hasCompanyContext) {
			setLoadingFleet(false);
			return;
		}
		setLoadingFleet(true);
		try {
			const params = { ...queryBase };
			if (fleetFilters.aircraft_id) params.aircraft_id = fleetFilters.aircraft_id;
			const data = await fetchAnalyticsFleetPerformance(params);
			setFleetData(data);
		} catch (e) {
			setError(e?.message || 'Failed to load fleet performance.');
		} finally {
			setLoadingFleet(false);
		}
	}, [platformAdmin, hasCompanyContext, queryBase, fleetFilters]);

	useEffect(() => {
		loadAircraft();
	}, [loadAircraft]);

	useEffect(() => {
		loadMaintenance();
	}, [loadMaintenance]);

	useEffect(() => {
		loadFleet();
	}, [loadFleet]);

	if (platformAdmin && !hasCompanyContext) {
		return (
			<Container maxWidth="lg" sx={{ py: 4 }}>
				<Alert severity="info">
					Select a company context (Site Admin) to view analytics for that tenant.
				</Alert>
			</Container>
		);
	}

	return (
		<Container
			maxWidth="lg"
			disableGutters
			sx={{
				py: { xs: 2, sm: 3 },
				px: { xs: 1.5, sm: 2, md: 3 },
				width: '100%',
				maxWidth: '100%',
				boxSizing: 'border-box',
			}}
		>
			<Stack spacing={2.5} sx={{ mb: 3, minWidth: 0 }}>
				<Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
					<InsightsOutlinedIcon
						sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main', flexShrink: 0, mt: 0.25 }}
					/>
					<Box sx={{ minWidth: 0 }}>
						<Typography
							component="h1"
							fontWeight={700}
							sx={{ fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' }, lineHeight: 1.2 }}
						>
							Analytics
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Maintenance trends and fleet performance for operational decisions
						</Typography>
					</Box>
				</Stack>
				<Stack
					direction={{ xs: 'column', sm: 'row' }}
					spacing={1.5}
					sx={{ width: '100%' }}
				>
					<TextField
						label="From"
						type="date"
						size="small"
						value={range.date_from}
						onChange={(e) => setRange((r) => ({ ...r, date_from: e.target.value }))}
						InputLabelProps={{ shrink: true }}
						sx={{ width: '100%', minWidth: 0, flex: { sm: 1 } }}
					/>
					<TextField
						label="To"
						type="date"
						size="small"
						value={range.date_to}
						onChange={(e) => setRange((r) => ({ ...r, date_to: e.target.value }))}
						InputLabelProps={{ shrink: true }}
						sx={{ width: '100%', minWidth: 0, flex: { sm: 1 } }}
					/>
				</Stack>
			</Stack>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
					{error}
				</Alert>
			)}

			<Stack spacing={{ xs: 2, sm: 3 }} sx={{ minWidth: 0, width: '100%' }}>
				<MaintenanceAnalyticsPanel
					data={maintenanceData}
					loading={loadingMaint}
					aircraftOptions={aircraft}
					filters={maintFilters}
					onFiltersChange={setMaintFilters}
				/>
				<FleetPerformancePanel
					data={fleetData}
					loading={loadingFleet}
					aircraftOptions={aircraft}
					filters={fleetFilters}
					onFiltersChange={setFleetFilters}
				/>
			</Stack>
		</Container>
	);
}
