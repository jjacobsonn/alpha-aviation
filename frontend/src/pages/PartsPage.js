// import FleetStatusPanel from "../components/FleetStatusPanel";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Menu,
  MenuItem,
  Container,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import HandymanIcon from "@mui/icons-material/Handyman";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  deleteInventory,
  fetchCompanyInventoriesDetailed,
  updateInventory,
} from "../shared/Api";

function PartsPage() {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventories, setInventories] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editValues, setEditValues] = useState({
    inStock: "",
    stockAlert: "",
    shopLocation: "",
    partId: null,
  });

  const openMenu = (event, part) => {
    setMenuAnchor(event.currentTarget);
    setSelectedPart(part);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await fetchCompanyInventoriesDetailed();
        if (!mounted) return;
        setInventories(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load inventory.");
      } finally {
        if (!mounted) return;
        setIsLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenEdit = (invRow) => {
    if (!invRow?.id) return;
    setSelectedPart(invRow);
    setEditValues({
      inStock: String(invRow?.inStock ?? ""),
      stockAlert: String(invRow?.stockAlert ?? ""),
      shopLocation: String(invRow?.shopLocation ?? ""),
      partId: invRow?.partId ?? null,
    });
    setEditOpen(true);
    setMenuAnchor(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedPart?.id) return;
    setIsSavingEdit(true);
    setError("");
    try {
      const payload = {
        in_stock: Number(editValues.inStock),
        stock_alert: Number(editValues.stockAlert),
        shop_location: editValues.shopLocation,
        part_id: editValues.partId,
      };
      await updateInventory(selectedPart.id, payload);
      const data = await fetchCompanyInventoriesDetailed();
      setInventories(Array.isArray(data) ? data : []);
      setEditOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to update inventory item.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const lowStockCount = useMemo(() => {
    return inventories.filter((inv) => {
      const inStock = Number(inv?.in_stock ?? 0);
      const alert = Number(inv?.stock_alert ?? 0);
      return inStock <= alert;
    }).length;
  }, [inventories]);

  const partsInStockCount = useMemo(() => {
    return inventories.filter((inv) => Number(inv?.in_stock ?? 0) > 0).length;
  }, [inventories]);

  const dashboardNumbers = useMemo(() => {
    return [
      {
        title: "Parts in Stock",
        icon: <PendingActionsIcon />,
        number: isLoading ? "—" : partsInStockCount,
      },
      {
        title: "Low Stock Alert",
        icon: <HandymanIcon />,
        number: isLoading ? "—" : lowStockCount,
      },
      {
        title: "Parts on Order",
        icon: <WorkHistoryIcon />,
        number: "—",
      },
      {
        title: "Tools Due for Calibration",
        icon: <WorkHistoryIcon />,
        number: "—",
      },
    ];
  }, [isLoading, lowStockCount, partsInStockCount]);

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

  const inventoryData = useMemo(() => {
    return inventories.map((inv) => {
      const part = inv?.part || {};
      const min = Number(inv?.stock_alert ?? 0);
      const max = "";
      return {
        id: inv?.id,
        pn: part?.part_number ?? "",
        partName: part?.name ?? "",
        oem: "—",
        vendor: "—",
        inStock: Number(inv?.in_stock ?? 0),
        stockAlert: Number(inv?.stock_alert ?? 0),
        minMax: `${min}${max ? ` / ${max}` : ""}`,
        shopLocation: inv?.shop_location ?? "—",
        location: inv?.shop_location ?? "—",
        condition: "—",
        expiration: "—",
        partId: part?.id ?? null,
      };
    });
  }, [inventories]);

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
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Parts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inventory and low stock alerts
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={3}>
            {dashboardNumbers.map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.title}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ py: 2.5 }}>
                    <Stack spacing={0.5} alignItems="center" textAlign="center">
                      <Box sx={{ color: item.icon?.props?.color || 'primary.main' }}>
                        {item.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900 }}>
                        {item.number}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Search..."
                />

                {error && (
                  <Box sx={{ color: 'error.main' }}>
                    {error}
                  </Box>
                )}

                <Table
                  size="small"
                  sx={{
                    minWidth: '100%',
                    '& .MuiTableCell-head': {
                      bgcolor: 'primary.main',
                      color: 'common.white',
                      fontWeight: 700,
                      borderColor: 'divider',
                    },
                    '& .MuiTableCell-root': { borderColor: 'divider' },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {inventoryFields.map((item) => (
                        <TableCell key={item}>{item}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  {inventoryData.map((item) => {
                    const status = currentStatus(item.inStock, item.minMax, item.expiration);
                    const color = getStatusColor(status);
                    return (
                      <TableRow key={item.id ?? item.pn} sx={{ bgcolor: color }}>
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
                          <IconButton
                            onClick={(e) => openMenu(e, item)}
                            disabled={isLoading}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Table>

                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={closeMenu}
                >
                  <MenuItem
                    onClick={() => {
                      if (!selectedPart?.id) {
                        closeMenu();
                        return;
                      }
                      deleteInventory(selectedPart.id)
                        .then(() => {
                          setInventories((prev) =>
                            prev.filter((inv) => inv?.id !== selectedPart.id)
                          );
                        })
                        .catch((e) => {
                          console.error('Failed to delete inventory', e);
                          setError(e?.message || 'Failed to delete inventory item.');
                        })
                        .finally(() => closeMenu());
                      closeMenu();
                    }}
                  >
                    Delete
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      handleOpenEdit(selectedPart);
                    }}
                  >
                    Edit
                  </MenuItem>
                </Menu>

                <Dialog
                  open={editOpen}
                  onClose={() => setEditOpen(false)}
                  maxWidth="sm"
                  fullWidth
                >
                  <DialogTitle>Edit Inventory</DialogTitle>
                  <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <TextField
                        label="Part"
                        value={`${selectedPart?.pn || ''}${
                          selectedPart?.partName ? ` - ${selectedPart.partName}` : ''
                        }`}
                        disabled
                        fullWidth
                      />
                      <TextField
                        label="In stock"
                        type="number"
                        value={editValues.inStock}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, inStock: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Stock alert"
                        type="number"
                        value={editValues.stockAlert}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, stockAlert: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Shop location"
                        value={editValues.shopLocation}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, shopLocation: e.target.value }))
                        }
                        fullWidth
                      />
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setEditOpen(false)} disabled={isSavingEdit}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || editValues.partId == null}
                    >
                      {isSavingEdit ? <CircularProgress size={18} /> : 'Save'}
                    </Button>
                  </DialogActions>
                </Dialog>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}

export default PartsPage;
