import React, { useEffect, useMemo, useState } from 'react';
import AddWorkOrderForm from '../components/AddWorkOrderForm';
import AddDiscrepancyForm from '../components/AddDiscrepancyForm';
import { fetchCompanyDiscrepancies, fetchCompanyWorkorders } from '../shared/Api';


const KPICard = ({ title, color, trend }) => (
	<>
		<div className='KPIcard' style={{
			//KPI Card Styling
			backgroundColor: color,
			width: '7em',
			height: '7em',
			textAlign: 'center',
			fontWeight: "bold",
		}}>
			<p>{title}</p>
			<p>{trend}</p>
		</div>
	</>
);

const Discrepancy = ({ discrepancy_number, part_number, aircraft, description }) => (
	<>
		<div style={{
			//work order styles
			bacground: 'grey',
			display: 'flex',
		}}>
			<p style={{ padding: '2em 4em', width: '15%', border: 'solid' }}>{discrepancy_number}</p>
			<p style={{ padding: '2em 4em', width: '15%', border: 'solid' }}>{part_number}</p>
			<p style={{ padding: '2em 4em', width: '15%', border: 'solid' }}>{aircraft}</p>
			<p style={{ padding: '2em 4em', width: '55%', border: 'solid' }}>{description}</p>

		</div>
	</>
);

const WorkOrder = ({ order_number, part_number, aircraft, description, assigned_to, due_date }) => (
	<div style={{
		display: 'flex',
		flexDirection: 'column',
		gap: '0px',
		border: 'solid',
		margin: '2em'
	}}>
		<div style={{
			//work order styles
			background: 'grey',
			display: 'flex',

		}}>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>{order_number}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>{part_number}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>{aircraft}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>assigned to: {assigned_to}</p>
			<p style={{ padding: '2em 2em', width: '20%', border: 'solid' }}>due: {due_date}</p>
		</div>
		<div>
			<p style={{ padding: '2em 2em' }}>{description}</p>
		</div>
	</div>
);

const Maintenance = () => {
	const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false);
	const [isAddDiscrepancyOpen, setIsAddDiscrepancyOpen] = useState(false);
	const [workOrders, setWorkOrders] = useState([]);
	const [discrepancies, setDiscrepancies] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let mounted = true;

		const load = async () => {
			setIsLoading(true);
			setError('');
			try {
				const [woData, discData] = await Promise.all([
					fetchCompanyWorkorders(),
					fetchCompanyDiscrepancies(),
				]);
				if (!mounted) return;
				setWorkOrders(Array.isArray(woData) ? woData : []);
				setDiscrepancies(Array.isArray(discData) ? discData : []);
			} catch (e) {
				if (!mounted) return;
				setError(e?.message || 'Failed to load maintenance data.');
			} finally {
				if (!mounted) return;
				setIsLoading(false);
			}
		};

		load();

		return () => {
			mounted = false;
		};
	}, []);

	const today = useMemo(() => new Date(), []);

	const overdueWorkOrders = useMemo(
		() =>
			workOrders.filter((wo) => {
				if (!wo.due_by) return false;
				const dueDate = new Date(wo.due_by);
				return dueDate < today;
			}),
		[workOrders, today]
	);

	const dueSoonWorkOrders = useMemo(
		() =>
			workOrders.filter((wo) => {
				if (!wo.due_by) return false;
				const dueDate = new Date(wo.due_by);
				const diffInTime = dueDate - today;
				const diffInDays = diffInTime / (1000 * 60 * 60 * 24);
				return diffInDays >= 0 && diffInDays <= 7;
			}),
		[workOrders, today]
	);

	const mappedWorkOrders = useMemo(
		() =>
			workOrders.map((wo) => ({
				id: wo.id,
				order_number: wo.id,
				part_number: (wo.parts_needed && wo.parts_needed.length) ? wo.parts_needed[0] : '',
				aircraft:
					typeof wo.aircraft === 'object'
						? wo.aircraft.model || wo.aircraft.registration_number
						: wo.aircraft,
				assigned_to: Array.isArray(wo.created_by) ? wo.created_by.join(' ') : wo.created_by,
				due_date: wo.due_by,
				description: wo.description,
			})),
		[workOrders]
	);

	const mappedDiscrepancies = useMemo(
		() =>
			discrepancies.map((d) => ({
				id: d.id,
				discrepancy_number: d.id,
				part_number: d.ata_code || '',
				aircraft: d.aircraft,
				description: d.description,
			})),
		[discrepancies]
	);
	return (
		<>
			{/* KPI CARD SECTION */}
			<div style={{
				//KPI card holder styles (mostly layout stuff)
				display: 'flex',
				justifyContent: 'space-evenly',
				marginBottom: '5em',
				marginTop: '1em',
				padding: '1em',
				backgroundColor: 'slategray',
			}}>
				<KPICard title="Pending" color="lightblue" trend={discrepancies.length} />
				<KPICard title="Open" color="mediumpurple" trend={workOrders.length} />
				<KPICard title="Overdue" color="firebrick" trend={overdueWorkOrders.length} />
				<KPICard title="Due Soon" color="lightgreen" trend={dueSoonWorkOrders.length} />
			</div >

			{/* WORK ORDER SECTION */}
			< div style={{
				display: 'flex',
				justifyContent: 'space-around',
				padding: '1em',
			}
			}>
				<button onClick={() => setIsAddWorkOrderOpen(true)}>
					add work order
				</button>
				<AddWorkOrderForm isOpen={isAddWorkOrderOpen} onClose={() => setIsAddWorkOrderOpen(false)} />
				<button onClick={() => setIsAddDiscrepancyOpen(true)}>
					add discrepancy
				</button>
				<AddDiscrepancyForm isOpen={isAddDiscrepancyOpen} onClose={() => setIsAddDiscrepancyOpen(false)} />
				<button>
					sort by
				</button>
			</div >

			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1em',
				padding: '2em',
			}}>
				{error && (
					<div style={{ color: 'red', marginBottom: '0.5em' }}>{error}</div>
				)}
				<h3>Open Work Orders</h3>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					overflow: 'auto',
					border: 'solid',
					padding: '1em',
					height: '30vh',
					overflow: 'auto',
				}}>
					{mappedWorkOrders.map((order) => (
						<WorkOrder
							key={order.id}
							order_number={order.order_number}
							part_number={order.part_number}
							aircraft={order.aircraft}
							assigned_to={order.assigned_to}
							due_date={order.due_date}
							description={order.description}
						/>
					))}
				</div>
			</div >

			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1em',
				padding: '2em',
			}}>
				<h3>Pending Work Orders</h3>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '1em',
					overflow: 'auto',
					border: 'solid',
					padding: '1em',
					height: '30vh',
					overflow: 'auto',
				}}>
					{mappedDiscrepancies.map((order) => (
						<Discrepancy
							key={order.id}
							discrepancy_number={order.discrepancy_number}
							part_number={order.part_number}
							aircraft={order.aircraft}
							description={order.description}
						/>
					))}
				</div>
			</div>


		</>
	)
}
export default Maintenance;
