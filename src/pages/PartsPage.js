import {
  Box
} from '@mui/material'
import { Typography, Container } from '@mui/material';

const PartsPage = () => {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h1" gutterBottom>
          Parts
        </Typography>
      </Container>
    </Box>
  )
}

export default PartsPage;