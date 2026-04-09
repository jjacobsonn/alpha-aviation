import React from "react";
import { Card, CardContent, Stack, Typography, Box } from "@mui/material";

export default function KPICard({ icon, label, value, loading = false, iconBgColor = "#2196F315", iconColor = "#2196F3" }) {
  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ bgcolor: iconBgColor, color: iconColor, p: 1.25, borderRadius: 2 }}>
              {icon}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {loading ? "—" : value}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
