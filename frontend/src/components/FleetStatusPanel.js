import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";

const fleetAOG = [
  "N1846A",
  "N2232X",
  "N2419J",
  "N2786F",
  "N7536L",
  "N7909Q",
  "N8301",
  "N8302",
  "N8303",
  "N8304",
  "N8305",
  "N9896Q",
];

const fleetDueSoon = [
  "N1871X",
  "N2426G",
  "N3076Q",
  "N4046C",
  "N5824M",
];

function FleetStatusPanel() {
  return (
    <Box
      sx={{
        width: 260,
        bgcolor: "#1e1e1e",
        borderRadius: 2,
        p: 2,
        color: "#fff",
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        // margin: 3
        gap: 2, mt: 2, mb: 2, ml: 2,
      }}
    >
      {/* Section title */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#f5b400" }}>
        Fleet Status
      </Typography>

      {/* Scrollable List */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          pr: 1,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#555",
            borderRadius: "4px",
          },
        }}
      >
        {/* AOG Section */}
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, color: "#c48f8f", fontWeight: 600 }}
        >
          AOG
        </Typography>
        <List dense disablePadding>
          {fleetAOG.map((tail) => (
            <ListItem key={tail} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                sx={{
                  bgcolor: "#3b1e1e",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "#5a2929" },
                }}
              >
                <ListItemText primary={tail} primaryTypographyProps={{ color: "#fff" }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2, borderColor: "#444" }} />

        {/* Due Soon Section */}
        <Typography
          variant="subtitle2"
          sx={{ mb: 1, color: "#c4a76b", fontWeight: 600 }}
        >
          Due Soon
        </Typography>
        <List dense disablePadding>
          {fleetDueSoon.map((tail) => (
            <ListItem key={tail} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                sx={{
                  bgcolor: "#3a2a17",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "#604a2d" },
                }}
              >
                <ListItemText primary={tail} primaryTypographyProps={{ color: "#fff" }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}

export default FleetStatusPanel;
