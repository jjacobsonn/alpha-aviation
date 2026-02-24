import React, { useState } from 'react';
import AddWorkOrderForm from '../components/AddWorkOrderForm';
import AddDiscrepancyForm from '../components/AddDiscrepancyForm';
import {makeApiRequest} from '../shared/Api';

//______________TEMPORARY DATA__________________

const workOrdersData = await makeApiRequest('GET', '/workorders');

const discrepanciesData = [
	{
		discrepancy_number: "D001",
		part_number: "09234",
		aircraft: "Boeing 747",
		description: "Part is giving error code 9243 in software"
	},
	{
		discrepancy_number: "D002",
		part_number: "04567",
		aircraft: "Airbus A320",
		description: "Minor oil leak detected"
	},
	{
		discrepancy_number: "D003",
		part_number: "07890",
		aircraft: "Boeing 737",
		description: "Cabin pressure sensor faulty"
	},
	{
		discrepancy_number: "D004",
		part_number: "03456",
		aircraft: "Embraer 190",
		description: "Navigation system update required"
	},
	{
		discrepancy_number: "D005",
		part_number: "05678",
		aircraft: "Boeing 777",
		description: "Fuel pump pressure inconsistency"
	},
	{
		discrepancy_number: "D006",
		part_number: "06789",
		aircraft: "Airbus A380",
		description: "Autopilot disengages during turbulence"
	},
	{
		discrepancy_number: "D007",
		part_number: "02345",
		aircraft: "Bombardier CS300",
		description: "Cabin lights flicker intermittently"
	},
	{
		discrepancy_number: "D008",
		part_number: "08901",
		aircraft: "Boeing 737 MAX",
		description: "Landing gear hydraulics slow to respond"
	},
	{
		discrepancy_number: "D009",
		part_number: "01234",
		aircraft: "Embraer 175",
		description: "Avionics software outdated"
	},
	{
		discrepancy_number: "D010",
		part_number: "04512",
		aircraft: "Airbus A321",
		description: "Engine oil temperature sensor failure"
	}
];

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
				<KPICard title="Pending" color="lightblue" trend={discrepanciesData.length} />
				<KPICard title="Open" color="mediumpurple" trend={workOrdersData.length} />
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
					{workOrdersData.map((order) => (
						<WorkOrder
							key={order.order_number} // React needs unique keys
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
