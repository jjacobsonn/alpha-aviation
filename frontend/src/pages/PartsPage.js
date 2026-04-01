// import FleetStatusPanel from "../components/FleetStatusPanel";
import { useEffect, useMemo, useState } from "react";
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
  MenuItem,
  Container,
  Card,
  CardContent,
  Grid,
  Alert,
} from "@mui/material";
import { useAppContext } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RemoveShoppingCartIcon from "@mui/icons-material/RemoveShoppingCart";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  deleteInventory,
  fetchCompanyInventoriesDetailed,
  updateInventory,
} from "../shared/Api";

function lineQty(inv) {
  return Number(inv?.in_stock ?? inv?.quantity ?? 0);
}

function PartsPage() {
  const { state } = useAppContext();
  const viewerIsPlatformAdmin = isPlatformAdmin(state.user);
  const adminCompanyFilter =
    typeof window !== "undefined" ? localStorage.getItem("adminCompanyId") : null;

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
    stockAlertPercentage: "",
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
      stockAlertPercentage: String(invRow?.stockAlertPercentage ?? ""),
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
        stock_alert_percentage: Number(editValues.stockAlertPercentage),
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
      const inStock = lineQty(inv);
      const alert = Number(inv?.stock_alert ?? 0);
      return inStock <= alert;
    }).length;
  }, [inventories]);

  const partsInStockCount = useMemo(() => {
    return inventories.filter((inv) => lineQty(inv) > 0).length;
  }, [inventories]);

  const totalUnitsInStock = useMemo(() => {
    return inventories.reduce((sum, inv) => sum + lineQty(inv), 0);
  }, [inventories]);

  const outOfStockCount = useMemo(() => {
    return inventories.filter((inv) => lineQty(inv) <= 0).length;
  }, [inventories]);

  const dashboardNumbers = useMemo(() => {
    return [
      {
        title: "Inventory Lines",
        icon: <Inventory2Icon />,
        number: isLoading ? "—" : inventories.length,
      },
      {
        title: "Units On Hand",
        icon: <PendingActionsIcon />,
        number: isLoading ? "—" : totalUnitsInStock,
      },
      {
        title: "Low Stock Alerts",
        icon: <WarningAmberIcon />,
        number: isLoading ? "—" : lowStockCount,
      },
      {
        title: "Out of Stock",
        icon: <RemoveShoppingCartIcon />,
        number: isLoading ? "—" : outOfStockCount,
      },
    ];
  }, [isLoading, inventories.length, lowStockCount, outOfStockCount, totalUnitsInStock]);

  const inventoryFields = useMemo(() => {
    const row = [
      "P/N",
      "Part Name",
      ...(viewerIsPlatformAdmin ? ["Company"] : []),
      "# in Stock",
      "Stock Alert",
      "Alert %",
      "Location",
      "Actions",
    ];
    return row;
  }, [viewerIsPlatformAdmin]);

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
      const qty = lineQty(inv);
      return {
        id: inv?.id,
        pn: part?.part_number ?? "",
        partName: part?.name ?? "",
        companyName: inv?.company?.name ?? "—",
        inStock: qty,
        stockAlert: Number(inv?.stock_alert ?? 0),
        stockAlertPercentage: Number(inv?.stock_alert_percentage ?? 0),
        minMax: `${min}${max ? ` / ${max}` : ""}`,
        shopLocation: inv?.shop_location ?? "—",
        location: inv?.shop_location ?? "—",
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

  // Keep table rows neutral while preserving the computed status logic.
  const getStatusColor = () => "transparent";

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

          {viewerIsPlatformAdmin && (
            <Alert severity="info">
              {adminCompanyFilter
                ? `Inventory is filtered to company id ${adminCompanyFilter} (set from Site Admin / Companies). Clear the selection there to see all companies.`
                : "As a platform admin you are viewing inventory lines for all companies. Open Site Admin → Companies and select a company to filter this list."}
            </Alert>
          )}

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
                    return (
                      <TableRow key={item.id ?? item.pn} sx={{ bgcolor: "transparent" }}>
                        <TableCell>{item.pn}</TableCell>
                        <TableCell>{item.partName}</TableCell>
                        {viewerIsPlatformAdmin ? (
                          <TableCell>{item.companyName}</TableCell>
                        ) : null}
                        <TableCell>{item.inStock}</TableCell>
                        <TableCell>{item.stockAlert}</TableCell>
                        <TableCell>{Math.round(item.stockAlertPercentage * 100)}%</TableCell>
                        <TableCell>{item.location}</TableCell>
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
                        label="Alert percentage (0 to 1)"
                        type="number"
                        inputProps={{ min: 0, max: 1, step: 0.01 }}
                        value={editValues.stockAlertPercentage}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, stockAlertPercentage: e.target.value }))
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
