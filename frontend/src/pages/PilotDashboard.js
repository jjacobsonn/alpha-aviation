import { Box, Card, CardContent, Container, Stack, Typography } from "@mui/material";

export default function PilotDashboard() {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Pilot Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Flight operations overview for pilot users.
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                This role page is now wired and stable. Next step is adding pilot-specific
                views (assigned flights, checklists, and discrepancy reporting workflow).
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
