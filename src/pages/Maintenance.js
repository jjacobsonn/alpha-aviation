import React, { useState } from 'react';

const KPICard = ({ title, color, trend }) => (
	<>
		<div className='KPIcard' style={{
			//KPI Card Styling
			backgroundColor: color,
			width: '7em',
			height: '7em',
			textAlign: 'center',
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
	<>
		<div style={{
			//work order styles
			bacground: 'grey',
			display: 'flex',
		}}>
			<p style={{ padding: '2em 4em', width: '20%', border: 'solid' }}>{order_number}</p>
			<p style={{ padding: '2em 4em', width: '20%', border: 'solid' }}>{part_number}</p>
			<p style={{ padding: '2em 4em', width: '20%', border: 'solid' }}>{aircraft}</p>
			<p style={{ padding: '2em 4em', width: '20%', border: 'solid' }}>assigned to: {assigned_to}</p>
			<p style={{ padding: '2em 4em', width: '20%', border: 'solid' }}>due: {due_date}</p>
		</div>
		<div>
			<p style={{ padding: '2em 4em', border: 'solid' }}>{description}</p>
		</div>
	</>
);

const Maintenance = () => {
	return (
		<>
			{/* KPI CARD SECTION */}
			<div style={{
				//KPI card holder styles (mostly layout stuff)
				display: 'flex',
				justifyContent: 'space-evenly',
				marginBottom: '5em',
				marginTop: '1em',
			}}>
				< KPICard title="Pending" color="red" trend="some text" />
				<KPICard title="Open" color="green" trend="some text" />
				<KPICard title="Overdue" color="yellow" trend="some text" />
				<KPICard title="Due Soon" color="blue" trend="some text" />
			</div >

			{/* WORK ORDER SECTION */}
			< div style={{
				display: 'flex',
				justifyContent: 'space-around',
				padding: '1em',
			}
			}>
				<button>
					add work order
				</button>
				<button>
					add discrepancy
				</button>
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
					gap: '1em',
					overflow: 'auto',
					border: 'solid',
					padding: '1em',
				}}>
					<WorkOrder order_number="001" part_number="09234" aircraft="Boeing 747" assigned_to="john" due_date="May, 10, 2026" description="part is giving error code 9243 in software" />
					<WorkOrder order_number="001" part_number="09234" aircraft="Boeing 747" assigned_to="john" due_date="May, 10, 2026" description="part is giving error code 9243 in software" />
					<WorkOrder order_number="001" part_number="09234" aircraft="Boeing 747" assigned_to="john" due_date="May, 10, 2026" description="part is giving error code 9243 in software" />
					<WorkOrder order_number="001" part_number="09234" aircraft="Boeing 747" assigned_to="john" due_date="May, 10, 2026" description="part is giving error code 9243 in software" />
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
				}}>
					<Discrepancy discrepancy_number="001" part_number="09234" aircraft="Boeing 747" description="part is giving error code 9243 in software" />
					<Discrepancy discrepancy_number="001" part_number="09234" aircraft="Boeing 747" description="part is giving error code 9243 in software" />
					<Discrepancy discrepancy_number="001" part_number="09234" aircraft="Boeing 747" description="part is giving error code 9243 in software" />
					<Discrepancy discrepancy_number="001" part_number="09234" aircraft="Boeing 747" description="part is giving error code 9243 in software" />
				</div>
			</div>


		</>
	)
}
export default Maintenance;
