import FleetStatusPanel from "../components/FleetStatusPanel";
import { Box, Button, Stack, TextField } from "@mui/material";
import HandymanIcon from "@mui/icons-material/Handyman";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

function PartsPage() {
  const buttons = [
    {
      title: "Due Maintenance",
      icon: <PendingActionsIcon />,
    },
    {
      title: "Parts",
      icon: <HandymanIcon />,
    },
    {
      title: "Maintenance History",
      icon: <WorkHistoryIcon />,
    },
  ];

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
          {buttons.map((item) => (
            <Button
              key={item.title}
              startIcon={item.icon}
              variant="outlined"
              sx={{
                m: 2,
                bgcolor: "#secondary.main",
                minHeight: "50px",
                minWidth: "200px",
                color: "white",
                borderColor: "#8e8e8eff",
                "&:hover": {
                  bgcolor: "#696969ff",
                  borderColor: "#ffcc00",
                },
              }}
            >
              {item.title}
            </Button>
          ))}
        </Stack>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <FleetStatusPanel />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            bgcolor: "#4b4b4bff",
            flexGrow: 1,
            mt: 2,
            mb: 2,
            mr: 2,
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
        </Box>
      </Box>
    </Box>
  );
}

export default PartsPage;
