// import FleetStatusPanel from "../components/FleetStatusPanel";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
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
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import HistoryIcon from "@mui/icons-material/History";
import {
  deleteInventory,
  createInventory,
  createPart,
  fetchCompanyAircrafts,
  fetchCompanyInventoriesDetailed,
  fetchCompanyWorkorders,
  updateInventory,
  updatePart,
} from "../shared/Api";
import { useAppContext } from "../context/AppContext";
import useDebouncedValue from "../shared/useDebouncedValue";
import {
  PARTS_STATUS_FILTERS,
  buildPartsSuggestions,
  filterPartsRows,
} from "../shared/moduleSearch";
import ModuleSearchBar from "../components/search/ModuleSearchBar";
import ScrollableTableContainer from "../components/ScrollableTableContainer";
import ToolsCalibrationPanel from "../components/parts/ToolsCalibrationPanel";

function PartsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "tools" ? "tools" : "inventory";
  const { state } = useAppContext();
  const effectiveRole = state.viewAsUser?.role || state.user?.role;
  const canDeleteParts = effectiveRole === "owner";
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventories, setInventories] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [partsStatus, setPartsStatus] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [addValues, setAddValues] = useState({
    aircraftId: "",
    partNumber: "",
    partName: "",
    partDescription: "",
    inStock: "1",
    stockAlert: "1",
    shopLocation: "",
  });
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
        const [data, wos] = await Promise.all([
          fetchCompanyInventoriesDetailed(),
          fetchCompanyWorkorders(),
        ]);
        const aircraftData = await fetchCompanyAircrafts();
        if (!mounted) return;
        setInventories(Array.isArray(data) ? data : []);
        setWorkOrders(Array.isArray(wos) ? wos : []);
        setAircraftOptions(Array.isArray(aircraftData) ? aircraftData : []);
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

  const handleOpenAdd = () => {
    setAddValues({
      aircraftId: "",
      partNumber: "",
      partName: "",
      partDescription: "",
      inStock: "1",
      stockAlert: "1",
      shopLocation: "",
    });
    setAddOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!addValues.aircraftId || !addValues.partNumber.trim() || !addValues.partName.trim()) {
      setError("Aircraft, part number, and part name are required.");
      return;
    }
    setIsSavingAdd(true);
    setError("");
    try {
      const createdPart = await createPart({
        aircraft: Number(addValues.aircraftId),
        part_number: addValues.partNumber.trim(),
        name: addValues.partName.trim(),
        description: addValues.partDescription.trim(),
      });
      await createInventory({
        part_id: createdPart?.id,
        in_stock: Number(addValues.inStock || 0),
        stock_alert: Number(addValues.stockAlert || 0),
        shop_location: addValues.shopLocation,
      });
      const [data, wos] = await Promise.all([
        fetchCompanyInventoriesDetailed(),
        fetchCompanyWorkorders(),
      ]);
      setInventories(Array.isArray(data) ? data : []);
      setWorkOrders(Array.isArray(wos) ? wos : []);
      setAddOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to add part.");
    } finally {
      setIsSavingAdd(false);
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

  const awaitingPartsWoCount = useMemo(() => {
    return (workOrders || []).filter((wo) => wo?.status === "awaiting_parts").length;
  }, [workOrders]);

  const totalUnitsOnHand = useMemo(() => {
    return inventories.reduce((sum, inv) => {
      const qty = Number(inv?.in_stock ?? inv?.quantity ?? 0);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
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
        title: "Work orders awaiting parts",
        icon: <HourglassEmptyIcon />,
        number: isLoading ? "—" : awaitingPartsWoCount,
        color: "info.main",
      },
      {
        title: "Total units on hand",
        icon: <Inventory2OutlinedIcon />,
        number: isLoading ? "—" : totalUnitsOnHand,
        color: "info.main",
      },
    ];
  }, [isLoading, awaitingPartsWoCount, lowStockCount, partsInStockCount, totalUnitsOnHand]);

  const inventoryFields = [
    "P/N",
    "Part name",
    "Description",
    "In stock",
    "Reorder at",
    "Location",
    "Tracked units",
    "Low stock",
    "Actions",
  ];

  const goToComponentHistory = (row, { register = false } = {}) => {
    const params = new URLSearchParams();
    if (row?.pn) params.set("q", row.pn);
    if (register && row?.partId) {
      params.set("register", "1");
      params.set("part_id", String(row.partId));
      params.set("part_number", row.pn);
      if (row.partName) params.set("part_name", row.partName);
    }
    navigate(`/component-history?${params.toString()}`);
  };

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
        trackedUnits: Number(inv?.tracked_units_count ?? 0),
      };
    });
  }, [inventories]);

  const partsSuggestions = useMemo(
    () => buildPartsSuggestions(inventoryData, debouncedSearch),
    [inventoryData, debouncedSearch]
  );

  const filteredRows = useMemo(
    () => filterPartsRows(inventoryData, debouncedSearch, partsStatus),
    [inventoryData, debouncedSearch, partsStatus]
  );

  const handleTabChange = (_event, value) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (value === "inventory") {
          params.delete("tab");
          params.delete("tool");
        } else {
          params.set("tab", "tools");
        }
        return params;
      },
      { replace: true }
    );
  };

  const pageTitle = activeTab === "tools" ? "Calibration" : "Parts";
  const pageSubtitle =
    activeTab === "tools"
      ? "Calibration due dates and service records for shop equipment."
      : "Part numbers, quantities, and reorder levels.";

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {pageTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {pageSubtitle}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              component={RouterLink}
              to="/component-history"
              sx={{ alignSelf: { xs: "stretch", sm: "center" }, whiteSpace: "nowrap" }}
            >
              Component history
            </Button>
          </Stack>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab value="inventory" label="Inventory" />
            <Tab value="tools" label="Calibration" />
          </Tabs>

          {activeTab === "tools" ? <ToolsCalibrationPanel /> : null}

          {activeTab === "inventory" ? (
          <>
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

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
            <CardContent sx={{ minWidth: 0 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "flex-start" }}>
                  <Box sx={{ flex: 1, width: "100%" }}>
                    <ModuleSearchBar
                      value={search}
                      onChange={setSearch}
                      placeholder="Search part number, name, description, location…"
                      suggestions={partsSuggestions}
                      statusOptions={PARTS_STATUS_FILTERS}
                      statusValue={partsStatus}
                      onStatusChange={setPartsStatus}
                      statusVariant="chips"
                      resultCount={filteredRows.length}
                      totalCount={inventoryData.length}
                    />
                  </Box>
                  <Button variant="contained" onClick={handleOpenAdd} sx={{ whiteSpace: "nowrap", mt: { xs: 0, md: 0.5 } }}>
                    Add Part
                  </Button>
                </Stack>

                {error && (
                  <Box sx={{ color: 'error.main' }}>
                    {error}
                  </Box>
                )}

                <ScrollableTableContainer minWidth={920}>
                <Table
                  size="small"
                  sx={{
                    '& .MuiTableCell-head': {
                      bgcolor: 'primary.main',
                      color: 'common.white',
                      fontWeight: 700,
                      borderColor: 'divider',
                      whiteSpace: 'nowrap',
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
                  <TableBody>
                  {filteredRows.map((item) => (
                    <TableRow
                      key={item.id ?? item.pn}
                      hover
                      onClick={() => handleOpenEdit(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenEdit(item);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      sx={{ cursor: "pointer", bgcolor: "transparent" }}
                    >
                      <TableCell>{item.pn}</TableCell>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell
                        sx={{
                          minWidth: 220,
                          maxWidth: 360,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {item.partDescription || "—"}
                      </TableCell>
                      <TableCell>{item.inStock}</TableCell>
                      <TableCell>{item.stockAlert}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {item.trackedUnits > 0 ? (
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<HistoryIcon fontSize="small" />}
                            onClick={() => goToComponentHistory(item)}
                          >
                            {item.trackedUnits}
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => goToComponentHistory(item, { register: true })}
                          >
                            Track
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.lowStock ? (
                          <Chip size="small" color="warning" label="Yes" />
                        ) : (
                          <Chip size="small" variant="outlined" label="No" />
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          onClick={(e) => openMenu(e, item)}
                          disabled={isLoading}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
                </ScrollableTableContainer>

                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={closeMenu}
                >
                  {canDeleteParts ? (
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
                  ) : null}

                  <MenuItem
                    onClick={() => {
                      handleOpenEdit(selectedPart);
                    }}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      goToComponentHistory(selectedPart);
                      closeMenu();
                    }}
                  >
                    View component history
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      goToComponentHistory(selectedPart, { register: true });
                      closeMenu();
                    }}
                  >
                    Register tracked unit
                  </MenuItem>
                </Menu>

                <Dialog
                  open={addOpen}
                  onClose={() => setAddOpen(false)}
                  maxWidth="sm"
                  fullWidth
                >
                  <DialogTitle>Add part</DialogTitle>
                  <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      <TextField
                        select
                        label="Aircraft"
                        value={addValues.aircraftId}
                        onChange={(e) =>
                          setAddValues((p) => ({ ...p, aircraftId: e.target.value }))
                        }
                        fullWidth
                      >
                        {aircraftOptions.map((a) => (
                          <MenuItem key={a.id} value={String(a.id)}>
                            {a.registration_number} ({a.model})
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Part number"
                        value={addValues.partNumber}
                        onChange={(e) =>
                          setAddValues((p) => ({ ...p, partNumber: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Part name"
                        value={addValues.partName}
                        onChange={(e) =>
                          setAddValues((p) => ({ ...p, partName: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Description"
                        value={addValues.partDescription}
                        onChange={(e) =>
                          setAddValues((p) => ({ ...p, partDescription: e.target.value }))
                        }
                        fullWidth
                        multiline
                        minRows={2}
                      />
                      <TextField
                        label="In stock"
                        type="number"
                        value={addValues.inStock}
                        onChange={(e) =>
                          setAddValues((p) => ({ ...p, inStock: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Reorder at"
                        type="number"
                        value={addValues.stockAlert}
                        onChange={(e) =>
                          setAddValues((p) => ({ ...p, stockAlert: e.target.value }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Shop location"
                        value={addValues.shopLocation}
                        onChange={(e) =>
                          setAddValues((p) => ({ ...p, shopLocation: e.target.value }))
                        }
                        fullWidth
                      />
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setAddOpen(false)} disabled={isSavingAdd}>
                      Cancel
                    </Button>
                    <Button variant="contained" onClick={handleSaveAdd} disabled={isSavingAdd}>
                      {isSavingAdd ? <CircularProgress size={18} /> : "Create"}
                    </Button>
                  </DialogActions>
                </Dialog>

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
          </>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

export default PartsPage;
