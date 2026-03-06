// import FleetStatusPanel from "../components/FleetStatusPanel";
import { useState } from "react";
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Menu,
  MenuItem
} from "@mui/material";
import HandymanIcon from "@mui/icons-material/Handyman";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import MoreVertIcon from "@mui/icons-material/MoreVert";

function PartsPage() {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);

  const openMenu = (event, part) => {
    setMenuAnchor(event.currentTarget);
    setSelectedPart(part);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
  };

  const dashboardNumbers = [
    {
      title: "Parts in Stock",
      icon: <PendingActionsIcon />,
      number: 100,
    },
    {
      title: "Low Stock Alert",
      icon: <HandymanIcon />,
      number: 23,
    },
    {
      title: "Parts on Order",
      icon: <WorkHistoryIcon />,
      number: 34,
    },
    {
      title: "Tools Due for Calibration",
      icon: <WorkHistoryIcon />,
      number: 9,
    },
  ];

  const inventoryFields = [
    "P/N",
    "Part Name",
    "OEM",
    "Vendor",
    "# in Stock",
    "Min/Max lvl",
    "Location",
    "Condition",
    "Expiration Date",
    "Actions",
  ];

  const columnWidths = {
    pn: 120,
    partName: 150,
    oem: 120,
    vendor: 120,
    inStock: 90,
    minMax: 110,
    location: 140,
    condition: 120,
    expiration: 140,
    actions: 120,
  };

  const [inventoryData, setInventoryData] = useState([
    {
      pn: "A-10234",
      partName: "Hydraulic Pump Seal",
      oem: "AeroSeal Co.",
      vendor: "SkyTech Supplies",
      inStock: 12,
      minMax: "5 / 20",
      location: "Aisle 3 – Bin 12",
      condition: "New",
      expiration: "2025-11-19",
      actions: "Edit / Delete",
      status: "OK",
    },
    {
      pn: "B-55321",
      partName: "Fuel Line Hose",
      oem: "FuelWorks Inc.",
      vendor: "Global Parts LLC",
      inStock: 32,
      minMax: "10 / 30",
      location: "Aisle 1 – Bin 4",
      condition: "New",
      expiration: "2026-11-02",
      actions: "Edit / Delete",
      status: "EXPIRING",
    },
    {
      pn: "C-99102",
      partName: "Cooling Fan Assembly",
      oem: "ThermoFlight",
      vendor: "Aviation Central",
      inStock: 18,
      minMax: "3 / 15",
      location: "Aisle 4 – Bin 9",
      condition: "Used – Serviceable",
      expiration: "N/A",
      actions: "Edit / Delete",
      status: "OK",
    },
    {
      pn: "D-22011",
      partName: "Brake Pad Set",
      oem: "BrakePro",
      vendor: "SkyTech Supplies",
      inStock: 2,
      minMax: "5 / 10",
      location: "Aisle 2 – Bin 7",
      condition: "New",
      expiration: "2025-09-18",
      actions: "Edit / Delete",
      status: "EXPIRED",
    },
    {
      pn: "E-88410",
      partName: "Main Rotor Bolt",
      oem: "RotorWorks",
      vendor: "Flight Components Co.",
      inStock: 47,
      minMax: "20 / 60",
      location: "Aisle 5 – Bin 2",
      condition: "New",
      expiration: "2030-01-01",
      actions: "Edit / Delete",
      status: "EXPIRED",
    },
  ]);

  const currentStatus = (amount, minMax, expiration) => {
    const [min, max] = minMax.split(" / ").map(Number);

    if (amount <= 0) return "OUT";

    if (!expiration || expiration === "N/A") {
      if (amount === 0) return "OUT";
      if (amount > min) return "LOW";
      return "OK";
    }

    const expirationDate = new Date(expiration);
    const today = new Date();

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysTilExp = Math.ceil((expirationDate - today) / msPerDay);

    if (daysTilExp <= 0) return "EXPIRED";
    if (daysTilExp < 10) return "EXPIRING";
    if (amount < min) return "LOW";
    return "OK";
  };

  const getStatusColor = (status) => {
    status = status.toUpperCase();
    switch (status) {
      case "OK":
        return "rgba(0, 200, 0, 0.15)"; // light green
      case "EXPIRING":
        return "rgba(255, 200, 0, 0.25)"; // light amber
      case "LOW":
        return "rgba(255, 200, 0, 0.25)"; // same as expiring
      case "EXPIRED":
        return "rgba(255, 0, 0, 0.20)"; // light red
      case "OUT":
        return "rgba(255, 0, 0, 0.20)"; // same as expired
      default:
        return "transparent";
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", flexDirection: "column" }}>
      <Box
        mb={2}
        sx={{
          display: "flex",
          flexDirection: "row",
          minHeight: "100px",
          justifyContent: "center",
        }}
      >
        <Stack
          sx={{
            flexDirection: "row",
          }}
        >
          {dashboardNumbers.map((item) => (
            <Box
              key={item.title}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                margin: 3,
              }}
            >
              <Typography variant="h5">{item.title}</Typography>
              <Typography
                variant="p"
                sx={{ fontSize: 24, textAlign: "center" }}
              >
                {item.number}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "row" }}>
        {/* <FleetStatusPanel /> */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            // bgcolor: "#4b4b4bff",
            flexGrow: 1,
            mt: 2,
            mb: 2,
            mr: 0,
            ml: 0,
            borderRadius: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search..."
            sx={{
              m: 2,
              borderRadius: 2,
              bgcolor: "#FFFFFF",
            }}
          />

          {/* Inventory Column Fields */}
          <Table sx={{ minWidth: "100%" }}>
            <TableHead>
              <TableRow>
                {inventoryFields.map((item) => {
                  return <TableCell key={item}>{item}</TableCell>;
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {inventoryData.map((item) => {
                const status = currentStatus(
                  item.inStock,
                  item.minMax,
                  item.expiration
                );
                const color = getStatusColor(status);

                return (
                  <TableRow key={item.pn} sx={{ bgcolor: color }}>
                    <TableCell>{item.pn}</TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell>{item.oem}</TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell>{item.inStock}</TableCell>
                    <TableCell>{item.minMax}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>{item.condition}</TableCell>
                    <TableCell>{item.expiration}</TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => openMenu(e, item)}>
                        <MoreVertIcon></MoreVertIcon>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
          >
            <MenuItem
              onClick={() => {
                setInventoryData(prev =>
                  prev.filter(item => item !== selectedPart)
                )
                // console.log("Delete", selectedPart);
                closeMenu();
              }}
            >
              Delete
            </MenuItem>

            <MenuItem
              onClick={() => {
                closeMenu();
              }}
            >
              Edit
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Box>
  );
}

export default PartsPage;
