import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';
import { makeApiRequest } from '../shared/Api';

export default function FleetUtilizationGraph() {
  const theme = useTheme();
  const [chartData, setChartData] = useState([]);
  const [aircraftTypes, setAircraftTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    makeApiRequest('GET', '/management/dashboard/')
      .then(response => {
        // Defensive: handle both possible spellings ("monthly_flight_hours" and "monthly_flight_hours")
        const flightHoursData = response.aircraft_analytics?.monthly_flight_hours || response.aircraft_analytics?.monthly_flight_hours || {};

        // 1. Identify all unique aircraft IDs (these will form our lines/series)
        const types = Object.keys(flightHoursData);
        setAircraftTypes(types);

        if (types.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Extract the sorted 12 months from the first available aircraft
        let rawMonths = Object.keys(flightHoursData[types[0]]);
        // Reverse them so they read chronologically past-to-present (Left to Right)
        const chronologicalMonths = [...rawMonths].reverse();

        // 3. Build the flat dataset for MUI X Charts
        const formattedDataset = chronologicalMonths.map(month => {
          const row = { month };
          types.forEach(type => {
            row[type] = flightHoursData[type][month] || 0;
          });
          return row;
        });

        setChartData(formattedDataset);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching fleet utilization data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // 4. Use a robust, visually distinct color palette for chart lines
  const colorPalette = [
    '#1976d2', // blue
    '#d32f2f', // red
    '#388e3c', // green
    '#fbc02d', // yellow
    '#7b1fa2', // purple
    '#f57c00', // orange
    '#0288d1', // cyan
    '#c2185b', // pink
    '#455a64', // dark gray
    '#8bc34a', // light green
  ];

  const chartSeries = aircraftTypes.map((type, index) => ({
    dataKey: type,
    label: `Type: ${type}`,
    color: colorPalette[index % colorPalette.length],
    showMark: true, // Forces the dots/markers to show up on the line connection joints
  }));

  return (
    <Box sx={{ width: '100%', my: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
            Fleet Utilization
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total flight hours logged per month by aircraft type
          </Typography>
        </Box>

        {chartData.length === 0 ? (
          <Typography align="center" sx={{ py: 4 }} color="text.secondary">
            No flight data recorded for this company.
          </Typography>
        ) : (
          <Box sx={{ width: '100%', height: 350 }}>
            <LineChart
              dataset={chartData}
              xAxis={[{ 
                scaleType: 'band', 
                dataKey: 'month',
                // Optional: clean up "2026-05" into a friendlier view like "05/26" or "May"
                valueFormatter: (value) => {
                  const [year, month] = value.split('-');
                  return `${month}/${year.slice(2)}`;
                }
              }]}
              yAxis={[{
                label: 'Total Hours Flown'
              }]}
              series={chartSeries}
              height={320}
              margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
              slotProps={{
                legend: {
                  direction: 'row',
                  position: { vertical: 'bottom', horizontal: 'center' },
                  padding: 0,
                },
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}