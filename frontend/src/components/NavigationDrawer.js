import { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
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
import BuildIcon from "@mui/icons-material/Build";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SettingsIcon from "@mui/icons-material/Settings";
import DomainIcon from "@mui/icons-material/Domain";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { logoutUser } from "../shared/Api";
import { ACTION_TYPES } from "../context/AppContext";
import { isPlatformAdmin } from "../shared/rbac";

const drawerWidthExpanded = 260;
const drawerWidthCollapsed = 72;

function NavigationDrawer() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useAppContext();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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
      // Close menu
      handleMenuClose();
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
      icon: <SettingsIcon />,
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
      id: "admin",
      title: "Organizations",
      icon: <DomainIcon />,
      color: "#00695c",
      allowedRoles: ["owner", "manager"],
      to: "/admin/companies",
    },
    {
      id: "parts",
      title: "Parts",
      icon: <InventoryIcon />,
      color: "#2B7FD4",
      allowedRoles: ["owner", "manager", "mechanic"],
    },
    {
      id: "maintenance",
      title: "Maintenance",
      icon: <BuildIcon />,
      color: "#FF9800",
      allowedRoles: ["owner", "manager", "mechanic"],
    },
    {
      id: "pilot-dashboard",
      title: "Pilot Dashboard",
      icon: <FlightTakeoffIcon />,
      color: "#7b1fa2",
      allowedRoles: ["pilot"],
      to: "/pilot-dashboard",
    },
    {
      id: "dispatcher-dashboard",
      title: "Dispatcher Dashboard",
      icon: <DashboardIcon />,
      color: "#00897b",
      allowedRoles: ["dispatcher"],
      to: "/dispatcher-dashboard",
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
      {/* ... existing code ... */}

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

      {/* Bottom Navigation Items */}
      <List sx={{ px: 1, py: 2 }}>
        <Tooltip
          title={!sidebarOpen ? "Notifications" : ""}
          placement="right"
        >
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
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
                <NotificationsIcon />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="Notifications" />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        <Tooltip title={!sidebarOpen ? "Settings" : ""} placement="right">
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
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
                <SettingsIcon />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="Settings" />}
            </ListItemButton>
          </ListItem>
        </Tooltip>

        <Tooltip title={!sidebarOpen ? "Account" : ""} placement="right">
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleMenuOpen}
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
                <AccountCircleIcon />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="Account" />}
            </ListItemButton>
          </ListItem>
        </Tooltip>
      </List>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Drawer>
  );
}

export default NavigationDrawer;
