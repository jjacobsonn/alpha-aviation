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

const Maintenance = () => {
	return (
		<>
			<div style={{
				//KPI card holder styles (mostly layout stuff)
				display: 'flex-box',
				justifyContent: 'space-evenly'
			}}>
				< KPICard title="Pending" color="red" trend="some text" />
				<KPICard title="Open" color="green" trend="some text" />
				<KPICard title="Overdue" color="yellow" trend="some text" />
				<KPICard title="Due Soon" color="blue" trend="some text" />
			</div>
		</>
	)
}
export default Maintenance;
