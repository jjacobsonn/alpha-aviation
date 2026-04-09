// import FleetStatusPanel from "../components/FleetStatusPanel";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Divider,
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
  updatePart,
} from "../shared/Api";

function PartsPage() {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventories, setInventories] = useState([]);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editValues, setEditValues] = useState({
    inStock: "",
    stockAlert: "",
    shopLocation: "",
    partId: null,
    partNumber: "",
    partName: "",
    partDescription: "",
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
      partNumber: invRow?.partNumber ?? "",
      partName: invRow?.partName ?? "",
      partDescription: invRow?.partDescription ?? "",
    });
    setEditOpen(true);
    setMenuAnchor(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedPart?.id) return;
    setIsSavingEdit(true);
    setError("");
    try {
      if (editValues.partId != null) {
        await updatePart(editValues.partId, {
          part_number: editValues.partNumber,
          name: editValues.partName,
          description: editValues.partDescription,
        });
      }
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
      setError(e?.message || "Failed to save.");
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
        color: "success.main",
      },
      {
        title: "Low Stock Alert",
        icon: <HandymanIcon />,
        number: isLoading ? "—" : lowStockCount,
        color: "warning.main",
      },
      {
        title: "Parts on Order",
        icon: <WorkHistoryIcon />,
        number: "—",
        color: "info.main",
      },
      {
        title: "Tools Due for Calibration",
        icon: <WorkHistoryIcon />,
        number: "—",
        color: "warning.main",
      },
    ];
  }, [isLoading, lowStockCount, partsInStockCount]);

  const inventoryFields = [
    "P/N",
    "Part name",
    "Description",
    "In stock",
    "Reorder at",
    "Location",
    "Low stock",
    "Actions",
  ];

  const inventoryData = useMemo(() => {
    return inventories.map((inv) => {
      const part = inv?.part || {};
      const qty = Number(inv?.in_stock ?? inv?.quantity ?? 0);
      const alert = Number(inv?.stock_alert ?? 0);
      const lowStock = alert > 0 && qty <= alert;
      return {
        id: inv?.id,
        pn: part?.part_number ?? "",
        partName: part?.name ?? "",
        partDescription: part?.description ?? "",
        partNumber: part?.part_number ?? "",
        inStock: qty,
        stockAlert: alert,
        shopLocation: inv?.shop_location ?? "",
        location: inv?.shop_location || "—",
        lowStock,
        partId: part?.id ?? null,
      };
    });
  }, [inventories]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventoryData;
    return inventoryData.filter((row) => {
      const blob = [
        row.pn,
        row.partName,
        row.partDescription,
        row.location,
        row.shopLocation,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [inventoryData, search]);

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
                Part catalog and quantities for your company.
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={3} sx={{ display: "flex" }}>
            {dashboardNumbers.map((item) => (
              <Grid item sx={{ flex: 1, minWidth: 150 }} key={item.title}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', width: "100%", display: "flex", flexDirection: "column", height: "100%" }}>
                  <CardContent sx={{ py: 2.5, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Stack spacing={0.5} alignItems="center" textAlign="center">
                      <Box sx={{ color: item.color }}>
                        {item.icon}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: item.color }}>
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
                  placeholder="Search part number, name, description, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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

                  {filteredRows.map((item) => (
                    <TableRow key={item.id ?? item.pn} sx={{ bgcolor: "transparent" }}>
                      <TableCell>{item.pn}</TableCell>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.partDescription || ""}
                      >
                        {item.partDescription || "—"}
                      </TableCell>
                      <TableCell>{item.inStock}</TableCell>
                      <TableCell>{item.stockAlert}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        {item.lowStock ? (
                          <Chip size="small" color="warning" label="Yes" />
                        ) : (
                          <Chip size="small" variant="outlined" label="No" />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={(e) => openMenu(e, item)}
                          disabled={isLoading}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  <DialogTitle>Edit part &amp; stock</DialogTitle>
                  <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Part (catalog)
                      </Typography>
                      <TextField
                        label="Part number"
                        value={editValues.partNumber}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, partNumber: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Name"
                        value={editValues.partName}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, partName: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Description"
                        value={editValues.partDescription}
                        onChange={(e) =>
                          setEditValues((p) => ({ ...p, partDescription: e.target.value }))
                        }
                        fullWidth
                        multiline
                        minRows={2}
                      />
                      <Divider />
                      <Typography variant="subtitle2" color="text.secondary">
                        Stock (this warehouse row)
                      </Typography>
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
                        label="Reorder at (quantity)"
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
