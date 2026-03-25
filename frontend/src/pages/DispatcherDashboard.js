import { Box, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import AdminCompanyContextBar from "../components/AdminCompanyContextBar";

export default function DispatcherDashboard() {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <AdminCompanyContextBar title="Admin test controls" roleFilter={["dispatcher"]} />
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Dispatcher Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scheduling and dispatch operations view.
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                This role page is now wired and stable. Next step is integrating
                dispatch-specific scheduling, assignment, and aircraft availability tools.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
