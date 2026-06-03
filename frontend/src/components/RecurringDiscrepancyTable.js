import React, { useState, useEffect } from 'react';
import {
	Box,
	Card,
	CardContent,
	CircularProgress,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Typography,
} from '@mui/material';
import { makeApiRequest } from '../shared/Api';
import ScrollableTableContainer from './ScrollableTableContainer';

const fetchRecurringDiscrepancies = async () => {
	try {
		const response = await makeApiRequest('GET', '/management/dashboard/');
		return (
			response.aircraft_analytics?.recuring_discrepancies ||
			response.aircraft_analytics?.recurring_discrepancies ||
			{}
		);
	} catch (error) {
		console.error('Error fetching recurring discrepancies:', error);
		return {};
	}
};

export default function RecurringDiscrepancyTable() {
	const [discrepancyData, setDiscrepancyData] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchRecurringDiscrepancies()
			.then((data) => {
				setDiscrepancyData(data);
				setLoading(false);
			})
			.catch(() => {
				setError('Failed to load recurring discrepancies.');
				setLoading(false);
			});
	}, []);

	const dataRows = Object.entries(discrepancyData);

	return (
		<Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: '100%' }}>
			<CardContent sx={{ p: { xs: 2, sm: 3 } }}>
				<Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.6 }}>
					Recurring discrepancies
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					ATA codes that repeat across the fleet
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
									<TableCell sx={{ width: '18%' }}>ATA code</TableCell>
									<TableCell sx={{ width: '22%' }}>Component</TableCell>
									<TableCell sx={{ width: '12%' }}>Frequency</TableCell>
									<TableCell>Tail IDs affected</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{dataRows.length === 0 ? (
									<TableRow>
										<TableCell colSpan={4} align="center">
											No recurring trends detected.
										</TableCell>
									</TableRow>
								) : (
									dataRows.map(([ataCode, valueArray]) => {
										const frequency = valueArray[0];
										const tailNumbers = valueArray[1];

										return (
											<TableRow key={ataCode} hover>
												<TableCell sx={{ fontWeight: 600 }}>{ataCode}</TableCell>
												<TableCell color="text.secondary">
													<em>—</em>
												</TableCell>
												<TableCell>{frequency}</TableCell>
												<TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
													{Array.isArray(tailNumbers) ? tailNumbers.join(', ') : tailNumbers}
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</ScrollableTableContainer>
				)}
			</CardContent>
		</Card>
	);
}
