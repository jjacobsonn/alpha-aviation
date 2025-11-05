import { useNavigate } from 'react-router-dom';
import {
	AppBar,
	Toolbar,
	Typography,
	Button,
	Container,
	Box,
	Grid,
	Card,
	Stack,
	Divider,
	Paper,
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BuildIcon from '@mui/icons-material/Build';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const LandingPage = () => {
	const navigate = useNavigate();
	return (
		<Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
			{/* Navigation Bar */}
			<AppBar
				position="static"
				elevation={1}
				sx={{ bgcolor: 'white', color: 'primary.main' }}
			>
				<Toolbar sx={{ py: 1 }}>
					<FlightTakeoffIcon sx={{ mr: 1.5, fontSize: 28 }} />
					<Typography
						variant="h6"
						component="div"
						sx={{ flexGrow: 1, fontWeight: 600 }}
					>
						AIMS Next
					</Typography>
					<Stack
						direction="row"
						spacing={3}
						sx={{ mr: 3, display: { xs: 'none', md: 'flex' } }}
					>
						<Button color="inherit" sx={{ textTransform: 'none' }}>
							Solutions
						</Button>
						<Button color="inherit" sx={{ textTransform: 'none' }}>
							Products
						</Button>
						<Button color="inherit" sx={{ textTransform: 'none' }}>
							Resources
						</Button>
						<Button color="inherit" sx={{ textTransform: 'none' }}>
							About
						</Button>
					</Stack>
					<Stack direction="row" spacing={2}>
						<Button
							variant="outlined"
							sx={{
								textTransform: 'none',
								px: 3,
								borderColor: 'primary.main',
								color: 'primary.main',
								'&:hover': {
									borderColor: 'primary.dark',
									bgcolor: 'rgba(39, 52, 105, 0.04)',
								},
							}}
							onClick={() => navigate('/login')}
						>
							Login
						</Button>
						<Button
							variant="contained"
							sx={{ textTransform: 'none', px: 3 }}
							onClick={() => navigate('/home')}
						>
							Get a Demo
						</Button>
					</Stack>
				</Toolbar>
			</AppBar>

			{/* Hero Section */}
			<Box
				sx={{
					background:
						'linear-gradient(135deg, #273469 0%, #1a2347 50%, #273469 100%)',
					color: 'white',
					py: { xs: 8, md: 15 },
					position: 'relative',
					overflow: 'hidden',
					'&::before': {
						content: '""',
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background:
							'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
					},
				}}
			>
				<Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
					<Grid container spacing={6} alignItems="center">
						<Grid item xs={12} md={7}>
							<Typography
								variant="overline"
								sx={{
									color: 'rgba(255,255,255,0.8)',
									letterSpacing: 2,
									fontWeight: 600,
									mb: 2,
									display: 'block',
								}}
							>
								NEXT-GENERATION AVIATION SOFTWARE
							</Typography>
							<Typography
								variant="h2"
								component="h1"
								sx={{
									fontWeight: 700,
									mb: 3,
									fontSize: { xs: '2.5rem', md: '3.5rem' },
								}}
							>
								Aviation Software for More Uptime
							</Typography>
							<Typography
								variant="h6"
								sx={{ mb: 4, opacity: 0.95, lineHeight: 1.6, fontWeight: 400 }}
							>
								A modern replacement for A.I.M.S. — Intelligent solutions for
								maintenance tracking, fleet management, inventory, and flight
								operations.
							</Typography>
							<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
								<Button
									variant="contained"
									size="large"
									onClick={() => navigate('/home')}
									sx={{
										bgcolor: 'white',
										color: 'primary.main',
										px: 4,
										py: 1.5,
										fontSize: '1.1rem',
										textTransform: 'none',
										fontWeight: 600,
										'&:hover': {
											bgcolor: '#FAFAFF',
											transform: 'translateY(-2px)',
										},
										transition: 'all 0.3s',
									}}
								>
									Get Started
								</Button>
								<Button
									variant="outlined"
									size="large"
									sx={{
										borderColor: 'white',
										borderWidth: 2,
										color: 'white',
										px: 4,
										py: 1.5,
										fontSize: '1.1rem',
										textTransform: 'none',
										fontWeight: 600,
										'&:hover': {
											borderColor: 'white',
											borderWidth: 2,
											bgcolor: 'rgba(255,255,255,0.1)',
											transform: 'translateY(-2px)',
										},
										transition: 'all 0.3s',
									}}
								>
									Watch Demo
								</Button>
							</Stack>
						</Grid>
						<Grid
							item
							xs={12}
							md={5}
							sx={{ display: { xs: 'none', md: 'block' } }}
						>
							<Box
								sx={{
									bgcolor: 'rgba(255,255,255,0.1)',
									backdropFilter: 'blur(10px)',
									borderRadius: 3,
									p: 4,
									border: '1px solid rgba(255,255,255,0.2)',
								}}
							>
								<Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
									Trusted by Industry Leaders
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={6}>
										<Typography
											variant="h3"
											sx={{ fontWeight: 700, color: 'white' }}
										>
											1000+
										</Typography>
										<Typography variant="body2" sx={{ opacity: 0.8 }}>
											Customers
										</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography
											variant="h3"
											sx={{ fontWeight: 700, color: 'white' }}
										>
											5000+
										</Typography>
										<Typography variant="body2" sx={{ opacity: 0.8 }}>
											Aircraft
										</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography
											variant="h3"
											sx={{ fontWeight: 700, color: 'white' }}
										>
											99.9%
										</Typography>
										<Typography variant="body2" sx={{ opacity: 0.8 }}>
											Uptime
										</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography
											variant="h3"
											sx={{ fontWeight: 700, color: 'white' }}
										>
											24/7
										</Typography>
										<Typography variant="body2" sx={{ opacity: 0.8 }}>
											Support
										</Typography>
									</Grid>
								</Grid>
							</Box>
						</Grid>
					</Grid>
				</Container>
			</Box>

			{/* What We Do Section */}
			<Container maxWidth="lg" sx={{ py: 10 }}>
				<Box sx={{ textAlign: 'center', mb: 8 }}>
					<Typography
						variant="overline"
						sx={{
							color: 'primary.main',
							fontWeight: 600,
							letterSpacing: 2,
							mb: 1,
							display: 'block',
						}}
					>
						WHAT WE DO
					</Typography>
					<Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
						Smarter Aviation Software
					</Typography>
					<Typography
						variant="h6"
						color="text.secondary"
						sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.7 }}
					>
						We develop intelligent software solutions that enable everyone in
						the aviation industry to get their aircraft more uptime.
					</Typography>
				</Box>

				<Grid container spacing={4}>
					<Grid item xs={12} sm={6} md={4}>
						<Card
							elevation={0}
							sx={{
								height: '100%',
								p: 3,
								border: '1px solid',
								borderColor: 'divider',
								transition: 'all 0.3s',
								'&:hover': {
									transform: 'translateY(-8px)',
									boxShadow: '0 12px 24px rgba(39, 52, 105, 0.15)',
								},
							}}
						>
							<Box sx={{ mb: 3 }}>
								<BuildIcon sx={{ fontSize: 50, color: 'primary.main' }} />
							</Box>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
								Maintenance Tracking
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ lineHeight: 1.7 }}
							>
								Comprehensive tracking for all maintenance operations, work
								orders, and compliance requirements in real-time.
							</Typography>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={4}>
						<Card
							elevation={0}
							sx={{
								height: '100%',
								p: 3,
								border: '1px solid',
								borderColor: 'divider',
								transition: 'all 0.3s',
								'&:hover': {
									transform: 'translateY(-8px)',
									boxShadow: '0 12px 24px rgba(39, 52, 105, 0.15)',
								},
							}}
						>
							<Box sx={{ mb: 3 }}>
								<InventoryIcon sx={{ fontSize: 50, color: 'primary.main' }} />
							</Box>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
								Inventory Management
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ lineHeight: 1.7 }}
							>
								Track parts, materials, and supplies with advanced inventory
								control and automated reordering capabilities.
							</Typography>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={4}>
						<Card
							elevation={0}
							sx={{
								height: '100%',
								p: 3,
								border: '1px solid',
								borderColor: 'divider',
								transition: 'all 0.3s',
								'&:hover': {
									transform: 'translateY(-8px)',
									boxShadow: '0 12px 24px rgba(39, 52, 105, 0.15)',
								},
							}}
						>
							<Box sx={{ mb: 3 }}>
								<FlightTakeoffIcon
									sx={{ fontSize: 50, color: 'primary.main' }}
								/>
							</Box>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
								Flight Operations
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ lineHeight: 1.7 }}
							>
								Streamline flight planning, scheduling, and operations
								management with integrated tools and real-time data.
							</Typography>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={4}>
						<Card
							elevation={0}
							sx={{
								height: '100%',
								p: 3,
								border: '1px solid',
								borderColor: 'divider',
								transition: 'all 0.3s',
								'&:hover': {
									transform: 'translateY(-8px)',
									boxShadow: '0 12px 24px rgba(39, 52, 105, 0.15)',
								},
							}}
						>
							<Box sx={{ mb: 3 }}>
								<AssessmentIcon sx={{ fontSize: 50, color: 'primary.main' }} />
							</Box>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
								Fleet Management
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ lineHeight: 1.7 }}
							>
								Complete oversight of your entire fleet with analytics,
								reporting, and predictive maintenance insights.
							</Typography>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={4}>
						<Card
							elevation={0}
							sx={{
								height: '100%',
								p: 3,
								border: '1px solid',
								borderColor: 'divider',
								transition: 'all 0.3s',
								'&:hover': {
									transform: 'translateY(-8px)',
									boxShadow: '0 12px 24px rgba(39, 52, 105, 0.15)',
								},
							}}
						>
							<Box sx={{ mb: 3 }}>
								<CloudDoneIcon sx={{ fontSize: 50, color: 'primary.main' }} />
							</Box>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
								Cloud-Based Platform
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ lineHeight: 1.7 }}
							>
								Access your data anywhere, anytime with our secure, reliable
								cloud infrastructure and mobile support.
							</Typography>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={4}>
						<Card
							elevation={0}
							sx={{
								height: '100%',
								p: 3,
								border: '1px solid',
								borderColor: 'divider',
								transition: 'all 0.3s',
								'&:hover': {
									transform: 'translateY(-8px)',
									boxShadow: '0 12px 24px rgba(39, 52, 105, 0.15)',
								},
							}}
						>
							<Box sx={{ mb: 3 }}>
								<SecurityIcon sx={{ fontSize: 50, color: 'primary.main' }} />
							</Box>
							<Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
								Enterprise Security
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ lineHeight: 1.7 }}
							>
								ISO 27001 certified security with advanced encryption and
								compliance to aviation industry standards.
							</Typography>
						</Card>
					</Grid>
				</Grid>
			</Container>

			{/* Benefits Section */}
			<Box sx={{ bgcolor: 'primary.main', color: 'white', py: 10 }}>
				<Container maxWidth="lg">
					<Typography
						variant="h3"
						align="center"
						sx={{ fontWeight: 700, mb: 2 }}
					>
						Why Choose AIMS Next?
					</Typography>
					<Typography variant="h6" align="center" sx={{ mb: 8, opacity: 0.9 }}>
						Get more aircraft uptime with intelligent aviation management
					</Typography>
					<Grid container spacing={6}>
						<Grid item xs={12} md={4}>
							<Stack spacing={2}>
								<SpeedIcon sx={{ fontSize: 48 }} />
								<Typography variant="h5" sx={{ fontWeight: 600 }}>
									No More Waiting
								</Typography>
								<Typography sx={{ opacity: 0.9, lineHeight: 1.7 }}>
									Get everything you need right at your fingertips, including
									real-time data for maintenance, operations, and regulatory
									compliance.
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={12} md={4}>
							<Stack spacing={2}>
								<CheckCircleIcon sx={{ fontSize: 48 }} />
								<Typography variant="h5" sx={{ fontWeight: 600 }}>
									No More Wondering
								</Typography>
								<Typography sx={{ opacity: 0.9, lineHeight: 1.7 }}>
									Intuitive platform interface makes finding what you're looking
									for easier, backed by a team of experts with deep aviation
									knowledge.
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={12} md={4}>
							<Stack spacing={2}>
								<AssessmentIcon sx={{ fontSize: 48 }} />
								<Typography variant="h5" sx={{ fontWeight: 600 }}>
									No More Wasted Effort
								</Typography>
								<Typography sx={{ opacity: 0.9, lineHeight: 1.7 }}>
									Intelligent databases leverage AI and machine learning to
									simplify aviation management, from documentation to
									troubleshooting.
								</Typography>
							</Stack>
						</Grid>
					</Grid>
				</Container>
			</Box>

			{/* CTA Section */}
			<Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
				<Paper
					elevation={0}
					sx={{
						p: 6,
						borderRadius: 3,
						border: '2px solid',
						borderColor: 'primary.main',
						bgcolor: 'background.paper',
					}}
				>
					<Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
						Ready to Get Started?
					</Typography>
					<Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
						See for yourself how AIMS Next can improve the efficiency of your
						operations
					</Typography>
					<Stack
						direction={{ xs: 'column', sm: 'row' }}
						spacing={2}
						justifyContent="center"
					>
						<Button
							variant="contained"
							size="large"
							onClick={() => navigate('/home')}
							sx={{
								px: 4,
								py: 1.5,
								fontSize: '1.1rem',
								textTransform: 'none',
								fontWeight: 600,
							}}
						>
							Get a Demo
						</Button>
						<Button
							variant="outlined"
							size="large"
							onClick={() => navigate('/home')}
							sx={{
								px: 4,
								py: 1.5,
								fontSize: '1.1rem',
								textTransform: 'none',
								fontWeight: 600,
							}}
						>
							Contact Sales
						</Button>
					</Stack>
				</Paper>
			</Container>

			{/* Footer */}
			<Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6 }}>
				<Container maxWidth="lg">
					<Grid container spacing={4} sx={{ mb: 4 }}>
						<Grid item xs={12} md={4}>
							<Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
								<FlightTakeoffIcon sx={{ mr: 1.5, fontSize: 28 }} />
								<Typography variant="h6" sx={{ fontWeight: 600 }}>
									AIMS Next
								</Typography>
							</Stack>
							<Typography
								variant="body2"
								sx={{ opacity: 0.8, lineHeight: 1.7 }}
							>
								Next-generation aviation information management software for
								more uptime and better efficiency.
							</Typography>
						</Grid>
						<Grid item xs={6} md={2}>
							<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
								Products
							</Typography>
							<Stack spacing={1}>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Maintenance
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Inventory
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Operations
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Analytics
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} md={2}>
							<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
								Company
							</Typography>
							<Stack spacing={1}>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									About Us
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Careers
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Contact
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Partners
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} md={2}>
							<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
								Resources
							</Typography>
							<Stack spacing={1}>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Documentation
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Support
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Blog
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Case Studies
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} md={2}>
							<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
								Legal
							</Typography>
							<Stack spacing={1}>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Privacy Policy
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Terms of Service
								</Typography>
								<Typography
									variant="body2"
									sx={{
										opacity: 0.8,
										cursor: 'pointer',
										'&:hover': { opacity: 1 },
									}}
								>
									Security
								</Typography>
							</Stack>
						</Grid>
					</Grid>
					<Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', my: 3 }} />
					<Typography variant="body2" align="center" sx={{ opacity: 0.7 }}>
						© 2025 AIMS Next. All rights reserved.
					</Typography>
				</Container>
			</Box>
		</Box>
	);
};

export default LandingPage;
