import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import { makeApiRequest } from '../shared/Api';

// Fetch recurring discrepancies from the management dashboard endpoint
const fetchRecurringDiscrepancies = async () => {
    try {
        const response = await makeApiRequest('GET', '/management/dashboard/');
        // Defensive: handle both possible spellings ("recuring" and "recurring")
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
// RecurringDiscrepancyTable component displays recurring discrepancy trends from the dashboard
export default function RecurringDiscrepancyTable() {
    const [discrepancyData, setDiscrepancyData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRecurringDiscrepancies()
            .then(data => {
                setDiscrepancyData(data);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load recurring discrepancies.');
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <Typography sx={{ p: 2 }}>Loading discrepancy trends...</Typography>;
    }
    if (error) {
        return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
    }

    // Convert the dictionary object into a mappable array
    const dataRows = Object.entries(discrepancyData);

    return (
        <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2, my: 2 }}>
            <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>ATA Code</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Component</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Frequency</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tail IDs Affected</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dataRows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} align="center">No recurring trends detected.</TableCell>
                        </TableRow>
                    ) : (
                        dataRows.map(([ataCode, valueArray]) => {
                            // Deconstruct the array structure: [frequency, [tail_ids]]
                            const frequency = valueArray[0];
                            const tailNumbers = valueArray[1];

                            return (
                                <TableRow key={ataCode} sx={{ '&:hover': { bgcolor: 'action.selected' } }}>
                                    {/* Column 1: The Key (ATA Code) */}
                                    <TableCell sx={{ fontWeight: 'medium' }}>{ataCode}</TableCell>
                                    {/* Column 2: Kept blank until we can get part names*/}
                                    <TableCell color="text.secondary"><em>—</em></TableCell>
                                    {/* Column 3: The first index in the array */}
                                    <TableCell>{frequency}</TableCell>
                                    {/* Column 4: The nested array inside index 1 */}
                                    <TableCell>{Array.isArray(tailNumbers) ? tailNumbers.join(', ') : tailNumbers}</TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}