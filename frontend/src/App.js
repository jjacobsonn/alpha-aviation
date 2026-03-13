import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppProvider } from './context/AppContext';
import CssBaseline from '@mui/material/CssBaseline';
import LandingPage from './components/LandingPage';
import Management from './pages/Management';
import AdminCompanies from './pages/AdminCompanies';
import AdminCompanyForm from './pages/AdminCompanyForm';
import PartsPage from './pages/PartsPage';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Maintenance from './pages/Maintenance';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const theme = createTheme({
	palette: {
		primary: {
			main: '#273469',
		},
		secondary: {
			main: '#FAFAFF',
		},
		background: {
			default: '#FAFAFF',
			paper: '#FFFFFF',
		},
	},
	typography: {
		fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
		h2: {
			fontWeight: 700,
		},
		h3: {
			fontWeight: 700,
		},
		h4: {
			fontWeight: 600,
		},
		h5: {
			fontWeight: 600,
		},
		h6: {
			fontWeight: 500,
		},
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 8,
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 12,
				},
			},
		},
	},
});

function App() {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppProvider>
				<Router>
					<Routes>
						{/* Public routes */}
						<Route path="/login" element={<Login />} />
						<Route path="/" element={<Login />} />

						{/* Protected routes */}
						<Route
							path="/management"
							element={
								<ProtectedRoute allowedRoles={['owner', 'manager']}>
									<Layout>
										<Management />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin/companies"
							element={
								<ProtectedRoute allowedRoles={['owner', 'manager']}>
									<Layout>
										<AdminCompanies />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin/companies/new"
							element={
								<ProtectedRoute allowedRoles={['owner', 'manager']}>
									<Layout>
										<AdminCompanyForm />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/parts"
							element={
								<ProtectedRoute allowedRoles={['owner', 'manager', 'mechanic']}>
									<Layout>
										<PartsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/maintenance"
							element={
								<ProtectedRoute allowedRoles={['owner', 'manager', 'mechanic']}>
									<Layout>
										<Maintenance />
									</Layout>
								</ProtectedRoute>
							}
						/>


						{/* 404 - Must be last */}
						<Route path="*" element={<NotFound />} />
					</Routes>
				</Router>
			</AppProvider>
		</ThemeProvider>
	);
}

export default App;
