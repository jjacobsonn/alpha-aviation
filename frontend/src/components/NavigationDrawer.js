import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Divider,
  Stack,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import AirlinesIcon from "@mui/icons-material/Airlines";
import BuildIcon from "@mui/icons-material/Build";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HistoryIcon from "@mui/icons-material/History";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import InsightsIcon from "@mui/icons-material/Insights";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DomainIcon from "@mui/icons-material/Domain";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useNavigate, useLocation } from "react-router";
import { useAppContext } from "../context/AppContext";
import { logoutUser } from "../shared/Api";
import { ACTION_TYPES } from "../context/AppContext";
import {
  allowedRolesForModule,
  getDefaultRouteForUser,
  getEffectiveCompanyRole,
  isPlatformAdmin,
  sortMenuItemsForRole,
} from "../shared/rbac";

const drawerWidthExpanded = 260;
const drawerWidthCollapsed = 72;

function NavigationDrawer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppContext();

  /** Phones/tablets: always icon rail. Desktop: user can expand/collapse. */
  const isCompact = isMobile || !sidebarOpen;
  const drawerWidth = isCompact ? drawerWidthCollapsed : drawerWidthExpanded;

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    if (!isMobile) {
      setSidebarOpen((open) => !open);
    }
  };

  const goToAppHome = () => {
    const home = getDefaultRouteForUser(state.user);
    if (home && home !== "/login") {
      navigate(home);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API call fails
    } finally {
      // Clear context state
      dispatch({ type: ACTION_TYPES.LOGGED_OUT });
      // Navigate to login
      navigate("/login");
    }
  };

  useEffect(() => {
    const currentPath = location.pathname.split("/")[1];
    setSelectedTab(currentPath || "dashboard");
  }, [location]);

  const role = state.user?.role;
  const platformAdmin = isPlatformAdmin(state.user);
  const effectiveRole = getEffectiveCompanyRole(state);

  const allMenuItems = [
    {
      id: "site-admin",
      title: "Site Admin",
      icon: <AdminPanelSettingsIcon />,
      color: "#455a64",
      allowedRoles: [],
      onlyPlatformAdmin: true,
      to: "/site-admin",
    },
    {
      id: "management",
      title: "Management",
      icon: <DashboardIcon />,
      color: "#2B7FD4",
      allowedRoles: ["owner", "manager"],
    },
    {
      id: "analytics",
      title: "Analytics",
      icon: <InsightsIcon />,
      color: "#6a1b9a",
      allowedRoles: allowedRolesForModule("analytics"),
      to: "/analytics",
    },
    {
      id: "admin",
      title: "Organizations",
      icon: <DomainIcon />,
      color: "#00695c",
      allowedRoles: ["manager"],
      to: "/admin/companies",
    },
    {
      id: "dispatcher-dashboard",
      title: "Dispatcher",
      icon: <DashboardIcon />,
      color: "#00897b",
      allowedRoles: allowedRolesForModule("dispatcherDashboard"),
      to: "/dispatcher-dashboard",
    },
    {
      id: "fleet",
      title: "Fleet",
      icon: <AirlinesIcon />,
      color: "#1976d2",
      allowedRoles: allowedRolesForModule("fleet"),
      to: "/fleet",
    },
    {
      id: "parts",
      title: "Parts",
      icon: <InventoryIcon />,
      color: "#2196F3",
      allowedRoles: allowedRolesForModule("parts"),
    },
    {
      id: "maintenance",
      title: "Maintenance",
      icon: <BuildIcon />,
      color: "#FF9800",
      allowedRoles: allowedRolesForModule("maintenance"),
    },
    {
      id: "work-orders",
      title: "Work Orders",
      icon: <WorkOutlineIcon />,
      color: "#fb8c00",
      allowedRoles: allowedRolesForModule("workOrders"),
      to: "/work-orders",
    },
    {
      id: "service-history",
      title: "Service History",
      icon: <HistoryIcon />,
      color: "#5c6bc0",
      allowedRoles: allowedRolesForModule("serviceHistory"),
      to: "/service-history",
    },
    {
      id: "component-history",
      title: "Component History",
      icon: <PrecisionManufacturingIcon />,
      color: "#6d4c41",
      allowedRoles: allowedRolesForModule("componentHistory"),
      to: "/component-history",
    },
    {
      id: "pilot-dashboard",
      title: "Pilot",
      icon: <FlightTakeoffIcon />,
      color: "#7b1fa2",
      allowedRoles: allowedRolesForModule("pilotDashboard"),
      to: "/pilot-dashboard",
    },
    {
      id: "calendar",
      title: "Calendar",
      icon: <CalendarMonthIcon />,
      color: "#2e7d32",
      allowedRoles: allowedRolesForModule("calendar"),
      to: "/calendar",
    },
  ];

  const menuItems = sortMenuItemsForRole(
    allMenuItems.filter((item) => {
    if (item.onlyPlatformAdmin && !platformAdmin) return false;
    if (platformAdmin) return true;
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    if (!effectiveRole) return false;
    return item.allowedRoles.includes(effectiveRole);
    }),
    state
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        display: { xs: "block" },
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "white",
          borderRight: "1px solid",
          borderColor: "divider",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: "hidden",
        },
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          px: isCompact ? 1 : 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: isCompact ? "center" : "space-between",
          minHeight: 56,
          flexDirection: isCompact ? "column" : "row",
          gap: isCompact ? 0.5 : 0,
        }}
      >
        {!isCompact && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            onClick={goToAppHome}
            sx={{ cursor: "pointer", minWidth: 0 }}
          >
            <img src="/logo.png" alt="AIMS" style={{ height: 28, width: 28 }} />
            <Typography
              variant="h6"
              noWrap
              sx={{ fontWeight: 600, color: "primary.main", fontSize: "1rem" }}
            >
              Alpha Aviation
            </Typography>
          </Stack>
        )}
        {isCompact && (
          <Tooltip title="Home" placement="right">
            <Box
              component="button"
              type="button"
              onClick={goToAppHome}
              aria-label="Go to home dashboard"
              sx={{
                border: 0,
                p: 0.5,
                bgcolor: "transparent",
                cursor: "pointer",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <img src="/logo.png" alt="AIMS" style={{ height: 28, width: 28 }} />
            </Box>
          </Tooltip>
        )}

        {!isMobile && (
          <IconButton onClick={toggleSidebar} size="small" aria-label="Toggle sidebar">
            {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Main Navigation Items */}
      <List sx={{ flexGrow: 1, px: 1, pt: 2 }}>
        {menuItems.map((item) => (
          <Tooltip
            key={item.id}
            title={isCompact ? item.title : ""}
            placement="right"
          >
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={selectedTab === item.id}
                onClick={() => {
                  const target = item.to || `/${item.id}`;
                  navigate(target);
                  setSelectedTab(item.id);
                }}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  justifyContent: isCompact ? "center" : "initial",
                  px: isCompact ? 1 : 2.5,
                  "&.Mui-selected": {
                    bgcolor: `${item.color}15`,
                    color: item.color,
                    "&:hover": {
                      bgcolor: `${item.color}20`,
                    },
                  },
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isCompact ? "auto" : 2,
                    justifyContent: "center",
                    color:
                      selectedTab === item.id ? item.color : "text.secondary",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!isCompact && (
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: "0.95rem",
                      fontWeight: selectedTab === item.id ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          </Tooltip>
        ))}
      </List>

      <Divider />

      {/* Footer: account & session (backlog 1.3.1 — profile from Account, not dead nav) */}
      <List sx={{ px: 1, py: 2 }}>
        <Tooltip title={isCompact ? "Account" : ""} placement="right">
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={location.pathname.startsWith("/account")}
              onClick={() => {
                navigate("/account");
                setSelectedTab("account");
              }}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                justifyContent: isCompact ? "center" : "initial",
                px: isCompact ? 1 : 2.5,
                "&.Mui-selected": {
                  bgcolor: "rgba(92, 107, 192, 0.12)",
                  color: "#3949ab",
                  "&:hover": { bgcolor: "rgba(92, 107, 192, 0.18)" },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isCompact ? "auto" : 2,
                  justifyContent: "center",
                  color: location.pathname.startsWith("/account")
                    ? "#3949ab"
                    : "text.secondary",
                }}
              >
                <AccountCircleIcon />
              </ListItemIcon>
              {!isCompact && (
                <ListItemText
                  primary="Account"
                  primaryTypographyProps={{ fontSize: "0.95rem", fontWeight: 500 }}
                />
              )}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        <Tooltip title={isCompact ? "Logout" : ""} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                justifyContent: isCompact ? "center" : "initial",
                px: isCompact ? 1 : 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isCompact ? "auto" : 2,
                  justifyContent: "center",
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              {!isCompact && (
                <ListItemText
                  primary="Logout"
                  primaryTypographyProps={{ fontSize: "0.95rem", fontWeight: 500 }}
                />
              )}
            </ListItemButton>
          </ListItem>
        </Tooltip>
      </List>
    </Drawer>
  );
}

export default NavigationDrawer;
