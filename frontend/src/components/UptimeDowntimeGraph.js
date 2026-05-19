import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { makeApiRequest } from '../shared/Api';

export default function AircraftUptimeDowntimeGraph() {
  const [chartDataset, setChartDataset] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    makeApiRequest('GET', '/management/dashboard/')
      .then(response => {
        const rawData = response.aircraft_analytics?.uptime_downtime || {};

        // Transform the dictionary object into a computed 100% stacked dataset
        const formattedData = Object.entries(rawData).map(([aircraftId, metrics]) => {
          const totalHours = metrics.total_time_hours || 0;
          const downHours = metrics.down_time_hours || 0;

          let downtimePercent = 0;
          let uptimePercent = 100;

          // Prevent division by zero if it's a brand new airplane with no logged history
          if (totalHours > 0) {
            downtimePercent = Math.round((downHours / totalHours) * 100);
            uptimePercent = 100 - downtimePercent;
          }

          return {
            aircraftType: aircraftId, // Y-Axis label (e.g., tail number or ID)
            uptime: uptimePercent,   // Stack 1 value
            downtime: downtimePercent, // Stack 2 value
            tooltipText: `Uptime: ${uptimePercent}% | Downtime: ${downtimePercent}%`
          };
        });

        setChartDataset(formattedData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching uptime/downtime telemetry data:', error);
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

  return (
    <Box sx={{ width: '100%', my: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
            Aircraft Uptime vs Downtime
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Percentage comparison of fleet operational availability vs maintenance constraints
          </Typography>
        </Box>

        {chartDataset.length === 0 ? (
          <Typography align="center" sx={{ py: 4 }} color="text.secondary">
            No airplane uptime metrics available.
          </Typography>
        ) : (
          <Box sx={{ width: '100%', height: 340 }}>
            <BarChart
              dataset={chartDataset}
              layout="horizontal"
              yAxis={[{
                scaleType: 'band',
                dataKey: 'aircraftType',
                label: 'Aircraft',
                tickLabelStyle: { fontWeight: 600, fontSize: 14 },
              }]}
              xAxis={[{
                max: 100,
                label: 'Percent of Time',
                valueFormatter: (value) => `${value}%`,
                tickLabelStyle: { fontWeight: 500, fontSize: 13 },
                gridLine: true,
              }]}
              series={[
                {
                  dataKey: 'uptime',
                  label: 'Uptime',
                  stack: 'availability',
                  color: '#388e3c', // Strong green
                  borderRadius: 6,
                  valueLabel: { position: 'right', formatter: v => v > 0 ? `${v}%` : '' },
                },
                {
                  dataKey: 'downtime',
                  label: 'Downtime',
                  stack: 'availability',
                  color: '#d32f2f', // Strong red
                  borderRadius: 6,
                  valueLabel: { position: 'left', formatter: v => v > 0 ? `${v}%` : '' },
                }
              ]}
              height={300}
              margin={{ left: 100, right: 30, top: 30, bottom: 50 }}
              slotProps={{
                legend: {
                  direction: 'row',
                  position: { vertical: 'bottom', horizontal: 'center' },
                  padding: 0,
                },
                bar: {
                  tooltip: ({ row }) => row.tooltipText,
                },
              }}
              grid={{ horizontal: true, vertical: false }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}