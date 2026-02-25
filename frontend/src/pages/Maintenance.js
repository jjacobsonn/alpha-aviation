import React, { useState } from 'react';
import '../theme.css';
import AddWorkOrderForm from '../components/AddWorkOrderForm';
import AddDiscrepancyForm from '../components/AddDiscrepancyForm';
import {makeApiRequest} from '../shared/Api';

//______________TEMPORARY DATA__________________

const workOrdersData = await makeApiRequest('GET', '/workorders');
const discrepanciesData = await makeApiRequest('GET', '/discrepancies');

const today = new Date();

const overdueWorkOrders = workOrdersData.filter(order => new Date(order.due_date) < today);

const dueSoonWorkOrders = workOrdersData.filter(order => {
	const dueDate = new Date(order.due_date);
	const diffInTime = dueDate - today; // difference in milliseconds
	const diffInDays = diffInTime / (1000 * 60 * 60 * 24); // convert to days
	return diffInDays >= 0 && diffInDays <= 7;
});


const KPICard = ({ title, color, trend }) => (
	<>
		<div className='KPIcard' style={{
			//KPI Card Styling
			backgroundColor: color,
			borderRadius:'10px',
			width: '7em',
			height: '7em',
			textAlign: 'center',
			fontWeight: "bold",
			boxShadow: '2px 2px',
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
		// border: 'solid',
		margin: '2em'
	}}>
		<div style={{
			//work order styles
			//background: 'grey',
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
				backgroundColor: 'lightgray',
			}}>
				<KPICard title="Pending" color= "var(--status-pending)" trend={discrepanciesData.length} />
				<KPICard title="Open" color="var(--status-open)" trend={workOrdersData.length} />
				<KPICard title="Overdue" color="var(--status-overdue)" trend={overdueWorkOrders.length} />
				<KPICard title="Due Soon" color="var(--status-due-soon)" trend={dueSoonWorkOrders.length} />
			</div >

			{/* WORK ORDER SECTION */}
			< div style={{
				display: 'flex',
				justifyContent: 'space-around',
				padding: '1em',
			}
			}>
				<button style={{
					padding: '8px, 16px',
					borderRadius: '10px',
					backgroundColor: 'var(--bg-glass)',
					fontWeight: 'bold',
					}}onClick={() => setIsAddWorkOrderOpen(true)}>
					add work order
				</button>
				<AddWorkOrderForm isOpen={isAddWorkOrderOpen} onClose={() => setIsAddWorkOrderOpen(false)} />
 				<button style={{
					padding: '8px, 16px',
					borderRadius: '10px',
					backgroundColor: 'var(--bg-glass)',
					fontWeight: 'bold',
				}}onClick={() => setIsAddDiscrepancyOpen(true)}>
					add discrepancy
				</button>
				<AddDiscrepancyForm isOpen={isAddDiscrepancyOpen} onClose={() => setIsAddDiscrepancyOpen(false)} />
 				<button style={{
					padding: '8px, 16px',
					borderRadius: '10px',
					backgroundColor: 'var(--bg-glass)',
					fontWeight: 'bold',
					}}>
					sort by
				</button>
			</div >

			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1em',
				padding: '2em',
			}}>
				<h3>Open Work Orders</h3>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					overflow: 'auto',
					border: 'solid',
					padding: '1em',
					height: '60vh',
					overflow: 'auto',
				}}>
					{workOrdersData.map((order) => (
						<WorkOrder
							key={order.order_number} // React needs unique keys
							order_number={order.id}
							part_number={order.part_number}
							aircraft={order.aircraft}
							assigned_to={order.assigned_to}
							due_date={order.due_by}
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
					height: '60vh',
					overflow: 'auto',
				}}>
					{discrepanciesData.map((order) => (
						<Discrepancy
							key={order.discrepancy_number}
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
