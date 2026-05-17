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
} from "@mui/material";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import AirlinesIcon from "@mui/icons-material/Airlines";
import BuildIcon from "@mui/icons-material/Build";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HistoryIcon from "@mui/icons-material/History";
import InsightsIcon from "@mui/icons-material/Insights";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DomainIcon from "@mui/icons-material/Domain";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { logoutUser } from "../shared/Api";
import { ACTION_TYPES } from "../context/AppContext";
import { allowedRolesForModule, isPlatformAdmin } from "../shared/rbac";

const drawerWidthExpanded = 260;
const drawerWidthCollapsed = 72;

function NavigationDrawer() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppContext();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
  const effectiveRole = role;

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
      id: "pilot-dashboard",
      title: "Pilot",
      icon: <FlightTakeoffIcon />,
      color: "#7b1fa2",
      allowedRoles: allowedRolesForModule("pilotDashboard"),
      to: "/pilot-dashboard",
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
      id: "calendar",
      title: "Calendar",
      icon: <CalendarMonthIcon />,
      color: "#2e7d32",
      allowedRoles: allowedRolesForModule("calendar"),
      to: "/calendar",
    },
  ];

  const menuItems = allMenuItems.filter((item) => {
    if (item.onlyPlatformAdmin && !platformAdmin) return false;
    if (platformAdmin) return true;
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    if (!effectiveRole) return false;
    return item.allowedRoles.includes(effectiveRole);
  });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarOpen ? drawerWidthExpanded : drawerWidthCollapsed,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: sidebarOpen ? drawerWidthExpanded : drawerWidthCollapsed,
          boxSizing: "border-box",
          bgcolor: "white",
          borderRight: "1px solid",
          borderColor: "divider",
          transition: "width 0.3s",
          overflowX: "hidden",
        },
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 64,
        }}
      >
        {sidebarOpen && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            onClick={() => navigate("/")}
            sx={{ cursor: "pointer" }}
          >
            <img src="/logo.png" alt="AIMS" style={{ height: 28, width: 28 }} />
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "primary.main" }}
            >
              Alpha Aviation
            </Typography>
          </Stack>
        )}
        {!sidebarOpen && (
          <img
            src="/logo.png"
            alt="AIMS"
            style={{ height: 28, width: 28, cursor: "pointer" }}
            onClick={() => navigate("/")}
          />
        )}

        <IconButton onClick={toggleSidebar} size="small">
          {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>

      <Divider />

      {/* Main Navigation Items */}
      <List sx={{ flexGrow: 1, px: 1, pt: 2 }}>
        {menuItems.map((item) => (
          <Tooltip
            key={item.id}
            title={!sidebarOpen ? item.title : ""}
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
                  justifyContent: sidebarOpen ? "initial" : "center",
                  px: 2.5,
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
                    mr: sidebarOpen ? 2 : "auto",
                    justifyContent: "center",
                    color:
                      selectedTab === item.id ? item.color : "text.secondary",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {sidebarOpen && (
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
        <Tooltip title={!sidebarOpen ? "Account" : ""} placement="right">
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
                justifyContent: sidebarOpen ? "initial" : "center",
                px: 2.5,
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
                  mr: sidebarOpen ? 2 : "auto",
                  justifyContent: "center",
                  color: location.pathname.startsWith("/account")
                    ? "#3949ab"
                    : "text.secondary",
                }}
              >
                <AccountCircleIcon />
              </ListItemIcon>
              {sidebarOpen && (
                <ListItemText
                  primary="Account"
                  primaryTypographyProps={{ fontSize: "0.95rem", fontWeight: 500 }}
                />
              )}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        <Tooltip title={!sidebarOpen ? "Logout" : ""} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                minHeight: 48,
                justifyContent: sidebarOpen ? "initial" : "center",
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarOpen ? 2 : "auto",
                  justifyContent: "center",
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              {sidebarOpen && (
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
