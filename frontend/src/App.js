import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppProvider } from './context/AppContext';
import CssBaseline from '@mui/material/CssBaseline';
import LandingPage from './components/LandingPage';
import Management from './pages/Management';
import AdminCompanies from './pages/AdminCompanies';
import AdminCompanyForm from './pages/AdminCompanyForm';
import CompanyOverview from './pages/CompanyOverview';
import PartsPage from './pages/PartsPage';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Maintenance from './pages/Maintenance';
import WorkOrders from './pages/WorkOrders';
import PilotDashboard from './pages/PilotDashboard';
import DispatcherDashboard from './pages/DispatcherDashboard';
import CalendarPage from './pages/DispatchCalendarPage';
import SiteAdminPortal from './pages/SiteAdminPortal';
import FleetPage from './pages/FleetPage';
import FleetDetailPage from './pages/FleetDetailPage';
import ServiceHistoryPage from './pages/ServiceHistoryPage';
import ComponentHistoryPage from './pages/ComponentHistoryPage';
import ToolsPage from './pages/ToolsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AccountPage from './pages/AccountPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { allowedRolesForModule } from './shared/rbac';

const theme = createTheme({
	palette: {
		primary: {
			main: '#FF4C05',
			light: '#FF7D3B',
			dark: '#CC3A00',
		},
		secondary: {
			main: '#FFF0E9',
		},
		background: {
			default: '#F7F5F3',
			paper: '#FFFFFF',
		},
		success: {
			main: '#00A86B',
		},
		warning: {
			main: '#F5A623',
		},
		error: {
			main: '#D92B2B',
		},
		info: {
			main: '#2B7FD4',
		},
		text: {
			primary: '#3A3D40',
			secondary: '#36454F',
		},
		divider: '#E2DDD9',
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
					minWidth: 0,
				},
			},
		},
		MuiTableContainer: {
			styleOverrides: {
				root: {
					width: '100%',
					maxWidth: '100%',
					minWidth: 0,
					overflowX: 'auto',
					WebkitOverflowScrolling: 'touch',
					overscrollBehaviorX: 'contain',
					touchAction: 'pan-x pan-y',
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
							path="/analytics"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('analytics')}>
									<Layout>
										<AnalyticsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin/companies"
							element={
								<ProtectedRoute allowedRoles={['manager']}>
									<Layout>
										<AdminCompanies />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin/companies/new"
							element={
								<ProtectedRoute allowedRoles={['manager']}>
									<Layout>
										<AdminCompanyForm />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/admin/companies/current"
							element={
								<ProtectedRoute allowedRoles={['manager']}>
									<Layout>
										<CompanyOverview />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/parts"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('parts')}>
									<Layout>
										<PartsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/maintenance"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('maintenance')}>
									<Layout>
										<Maintenance />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/work-orders"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('workOrders')}>
									<Layout>
										<WorkOrders />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/service-history"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('serviceHistory')}>
									<Layout>
										<ServiceHistoryPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/component-history"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('componentHistory')}>
									<Layout>
										<ComponentHistoryPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/tools"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('tools')}>
									<Layout>
										<ToolsPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/fleet"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('fleet')}>
									<Layout>
										<FleetPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/fleet/:id"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('fleetDetail')}>
									<Layout>
										<FleetDetailPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/pilot-dashboard"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('pilotDashboard')}>
									<Layout>
										<PilotDashboard />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/dispatcher-dashboard"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('dispatcherDashboard')}>
									<Layout>
										<DispatcherDashboard />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/calendar"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('calendar')}>
									<Layout>
										<CalendarPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/dispatch-calendar"
							element={
								<ProtectedRoute allowedRoles={allowedRolesForModule('calendar')}>
									<Layout>
										<CalendarPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/site-admin"
							element={
								<ProtectedRoute requirePlatformAdmin>
									<Layout>
										<SiteAdminPortal />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/account"
							element={
								<ProtectedRoute>
									<Layout>
										<AccountPage />
									</Layout>
								</ProtectedRoute>
							}
						/>

						<Route
							path="/change-password"
							element={
								<ProtectedRoute>
									<ChangePasswordPage />
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
