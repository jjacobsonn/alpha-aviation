import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export default function SiteAdminPortal() {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Site Admin
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Global administration workspace.
              </Typography>
              <Typography variant="body1">
                This is the frontend landing page for platform-level admin users. Use the
                Django admin for full data management until the custom site-admin replica
                is fully implemented.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => window.open("http://localhost:8000/admin/", "_blank")}
                >
                  Open Django Admin
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
