import React from "react";
import { Card, CardContent, Stack, Typography, Box } from "@mui/material";

export default function StatCard({ label, value, loading = false, icon = null }) {
  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "primary.main", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ textAlign: "center", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        {icon && (
          <Box sx={{ mb: 1.5 }}>
            {icon}
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: "text.primary" }}>
          {loading ? "—" : value}
        </Typography>
      </CardContent>
    </Card>
  );
}
