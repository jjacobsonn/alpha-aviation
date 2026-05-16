import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import { makeApiRequest } from '../shared/Api';

// Function to fetch recurring discrepancies from the backend API  
const fetchRecurringDiscrepancies = async () => {
    try {
        const response = await makeApiRequest('/api/recurring_discrepancies');
        return response.data; // Currently Expecting: { "32": [5, [1, 3]], "24": [8, [2, 4]] } TODO: this sould become one with part names
    } catch (error) {
        console.error('Error fetching recurring discrepancies:', error);
        return {}; // Return empty object instead of array to match data structure
    }
};

export default function RecurringDiscrepancyTable() {
    // 1. Manage state properly so React triggers a re-render when data arrives
    const [discrepancyData, setDiscrepancyData] = useState({});
    const [loading, setLoading] = useState(true);

    // 2. Fetch the data
    useEffect(() => {
        fetchRecurringDiscrepancies().then(data => {
            setDiscrepancyData(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <Typography sx={{ p: 2 }}>Loading discrepancy trends...</Typography>;
    }

    // 3. Convert the dictionary object into a mapable array
    // Object.entries(discrepancyData) turns the data into: [ ["32", [5, [1, 3]]], ["24", [8, [2, 4]]] ]
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
                                    <TableCell>{tailNumbers.join(', ')}</TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}