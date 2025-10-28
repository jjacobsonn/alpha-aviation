import NavigationDrawer from "../components/NavigationDrawer";
import {
  Box
} from '@mui/material'


function PartsPage() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <NavigationDrawer/>
    </Box>
  )
}

export default PartsPage;