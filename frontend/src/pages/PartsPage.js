// import FleetStatusPanel from "../components/FleetStatusPanel";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  PARTS_SORT_OPTIONS,
  buildPartsSuggestions,
} from "../shared/moduleSearch";
import ModuleSearchBar from "../components/search/ModuleSearchBar";
import ScrollableTableContainer from "../components/ScrollableTableContainer";
import TablePaginationBar, { ROWS_PER_PAGE_OPTIONS_5_10_15 } from "../components/TablePaginationBar";
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
  const [inventoryCount, setInventoryCount] = useState(0);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [partsStatus, setPartsStatus] = useState(() => searchParams.get("status") || "all");
  const sortOrder = searchParams.get("ordering") || "newest";
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("page_size") || 10);
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

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = {
        page,
        page_size: pageSize,
        ordering: sortOrder,
      };
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      if (partsStatus && partsStatus !== "all") params.status = partsStatus;
      const data = await fetchCompanyInventoriesDetailed(params);
      const rows = Array.isArray(data?.results) ? data.results : [];
      setInventories(rows);
      setInventoryCount(data?.count ?? rows.length);
      setInventorySummary(data?.summary ?? null);
    } catch (e) {
      setError(e?.message || "Failed to load inventory.");
      setInventories([]);
      setInventoryCount(0);
      setInventorySummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortOrder, debouncedSearch, partsStatus]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [wos, aircraftData] = await Promise.all([
          fetchCompanyWorkorders(),
          fetchCompanyAircrafts(),
        ]);
        if (!mounted) return;
        setWorkOrders(Array.isArray(wos) ? wos : []);
        setAircraftOptions(Array.isArray(aircraftData) ? aircraftData : []);
      } catch {
        /* non-blocking */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch.trim()) next.set("q", debouncedSearch.trim());
    else next.delete("q");
    if (partsStatus && partsStatus !== "all") next.set("status", partsStatus);
    else next.delete("status");
    if (sortOrder && sortOrder !== "newest") next.set("ordering", sortOrder);
    else next.delete("ordering");
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    if (pageSize !== 10) next.set("page_size", String(pageSize));
    else next.delete("page_size");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, partsStatus, sortOrder, page, pageSize]);

  const setSortOrder = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "newest") next.set("ordering", value);
    else next.delete("ordering");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const setPage = (p) => {
    const next = new URLSearchParams(searchParams);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const setPageSize = (size) => {
    const next = new URLSearchParams(searchParams);
    if (size !== 10) next.set("page_size", String(size));
    else next.delete("page_size");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

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
      await loadInventory();
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
      const partPayload = {
        part_number: addValues.partNumber.trim(),
        name: addValues.partName.trim(),
        description: addValues.partDescription.trim(),
      };
      if (addValues.aircraftId) {
        partPayload.aircraft = Number(addValues.aircraftId);
      }
      const createdPart = await createPart(partPayload);
      if (!createdPart?.id) {
        throw new Error("Part was created but no id was returned from the server.");
      }
      await createInventory({
        part_id: createdPart.id,
        in_stock: Number(addValues.inStock || 0),
        stock_alert: Number(addValues.stockAlert || 0),
        shop_location: addValues.shopLocation,
      });
      await loadInventory();
      setAddOpen(false);
    } catch (e) {
      const details = e?.data;
      if (details && typeof details === "object" && !Array.isArray(details)) {
        const lines = Object.entries(details).flatMap(([field, msgs]) => {
          const list = Array.isArray(msgs) ? msgs : [msgs];
          return list.map((msg) => `${field}: ${msg}`);
        });
        if (lines.length) {
          setError(lines.join(" "));
          return;
        }
      }
      setError(e?.message || "Failed to add part.");
    } finally {
      setIsSavingAdd(false);
    }
  };

  const lowStockCount = inventorySummary?.low_stock_count ?? 0;
  const partsInStockCount = inventorySummary?.parts_in_stock_count ?? 0;
  const awaitingPartsWoCount = useMemo(() => {
    return (workOrders || []).filter((wo) => wo?.status === "awaiting_parts").length;
  }, [workOrders]);
  const totalUnitsOnHand = inventorySummary?.total_units_on_hand ?? 0;

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

  const tableRows = inventoryData;

  const pageCount = Math.max(1, Math.ceil(inventoryCount / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageCount]);

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
                      onChange={(v) => {
                        setSearch(v);
                        const next = new URLSearchParams(searchParams);
                        next.delete("page");
                        setSearchParams(next, { replace: true });
                      }}
                      placeholder="Search part number, name, description, location…"
                      suggestions={partsSuggestions}
                      statusOptions={PARTS_STATUS_FILTERS}
                      statusValue={partsStatus}
                      onStatusChange={(v) => {
                        setPartsStatus(v);
                        const next = new URLSearchParams(searchParams);
                        next.delete("page");
                        setSearchParams(next, { replace: true });
                      }}
                      statusVariant="chips"
                      resultCount={tableRows.length}
                      totalCount={inventoryCount}
                    />
                  </Box>
                  <TextField
                    select
                    size="small"
                    label="Sort"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    sx={{ minWidth: 180, mt: { xs: 0, md: 0.5 } }}
                  >
                    {PARTS_SORT_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button variant="contained" onClick={handleOpenAdd} sx={{ whiteSpace: "nowrap", mt: { xs: 0, md: 0.5 } }}>
                    Add Part
                  </Button>
                </Stack>

                {error && (
                  <Box sx={{ color: 'error.main' }}>
                    {error}
                  </Box>
                )}

                {isLoading ? (
                  <Stack alignItems="center" py={4}>
                    <CircularProgress size={32} />
                  </Stack>
                ) : tableRows.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    No parts match the current filters.
                  </Typography>
                ) : (
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
                  {tableRows.map((item) => (
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
                )}

                {inventoryCount > 0 ? (
                  <TablePaginationBar
                    page={page}
                    pageCount={pageCount}
                    pageSize={pageSize}
                    total={inventoryCount}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS_5_10_15}
                  />
                ) : null}

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
                          .then(() => loadInventory())
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
