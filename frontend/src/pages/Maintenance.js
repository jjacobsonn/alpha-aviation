import React, { useState, useEffect } from 'react';
import '../theme.css';
import AddWorkOrderForm from '../components/AddWorkOrderForm';
import AddDiscrepancyForm from '../components/AddDiscrepancyForm';
import { makeApiRequest } from '../shared/Api';

// --- SUB-COMPONENTS ---

const KPICard = ({ title, color, trend }) => (
    <div className='KPIcard' style={{
        backgroundColor: color,
        borderRadius: '10px',
        width: '7em',
        height: '7em',
        textAlign: 'center',
        fontWeight: "bold",
        boxShadow: '2px 2px',
    }}>
        <p>{title}</p>
        <p>{trend}</p>
    </div>
);

const Discrepancy = ({ discrepancy_number, part_number, aircraft, description }) => (
    <div style={{
        display: 'flex',
        background: '#f9f9f9',
        marginBottom: '5px'
    }}>
        <p style={{ padding: '1em', width: '15%', border: 'solid 1px' }}>{discrepancy_number}</p>
        <p style={{ padding: '1em', width: '15%', border: 'solid 1px' }}>{part_number}</p>
        <p style={{ padding: '1em', width: '15%', border: 'solid 1px' }}>{aircraft}</p>
        <p style={{ padding: '1em', width: '55%', border: 'solid 1px' }}>{description}</p>
    </div>
);

const WorkOrder = ({
    id, title, created_by, description, part_needed, status, created_at, updated_at, due_by, aircraft, tach_time, hobbs_time, ATA_code, conponents_affected, components_image, signed_by, signature_date}) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        margin: '1em 0',
        border: '1px solid #ccc',
        backgroundColor: '#fff'
    }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
            <p style={{ padding: '1em', width: '20%', borderRight: '1px solid #eee' }}>{id}</p>
            <p style={{ padding: '1em', width: '20%', borderRight: '1px solid #eee' }}>{part_needed}</p>
            <p style={{ padding: '1em', width: '20%', borderRight: '1px solid #eee' }}>{aircraft}</p>
            <p style={{ padding: '1em', width: '20%', borderRight: '1px solid #eee' }}>Signed by: {signed_by}</p>
            <p style={{ padding: '1em', width: '20%' }}>Due: {due_by}</p>
        </div>
        <div>
            <p style={{ padding: '1em' }}>{description}</p>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const Maintenance = () => {
    // State management
    const [workOrdersData, setWorkOrdersData] = useState([]);
    const [discrepanciesData, setDiscrepanciesData] = useState([]);
    const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false);
    const [isAddDiscrepancyOpen, setIsAddDiscrepancyOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch data on mount
    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                // Fetching with trailing slashes to avoid 301 redirects
                const wo = await makeApiRequest('GET', '/workorders/');
                const disc = await makeApiRequest('GET', '/discrepancies/');
                
                setWorkOrdersData(wo || []);
                setDiscrepanciesData(disc || []);
            } catch (error) {
                console.error("Failed to load maintenance data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    // Derived Data (Calculations)
    const today = new Date();
    
    const overdueWorkOrders = workOrdersData.filter(order => {
        const dueDate = order.due_by ? new Date(order.due_by) : null;
        return dueDate && dueDate < today;
    });

    const dueSoonWorkOrders = workOrdersData.filter(order => {
        const dueDate = order.due_by ? new Date(order.due_by) : null;
        if (!dueDate) return false;
        const diffInDays = (dueDate - today) / (1000 * 60 * 60 * 24);
        return diffInDays >= 0 && diffInDays <= 7;
    });

    if (loading) {
        return <div style={{ padding: '5em', textAlign: 'center' }}>Loading Dashboard...</div>;
    }

    return (
        <>
            {/* KPI CARD SECTION */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-evenly',
                marginBottom: '3em',
                marginTop: '1em',
                padding: '1em',
                backgroundColor: 'lightgray',
            }}>
                <KPICard title="Pending" color="var(--status-pending)" trend={discrepanciesData.length} />
                <KPICard title="Open" color="var(--status-open)" trend={workOrdersData.length} />
                <KPICard title="Overdue" color="var(--status-overdue)" trend={overdueWorkOrders.length} />
                <KPICard title="Due Soon" color="var(--status-due-soon)" trend={dueSoonWorkOrders.length} />
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2em', padding: '1em' }}>
                <button 
                    style={{ padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => setIsAddWorkOrderOpen(true)}
                >
                    add work order
                </button>
                <AddWorkOrderForm isOpen={isAddWorkOrderOpen} onClose={() => setIsAddWorkOrderOpen(false)} />

                <button 
                    style={{ padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => setIsAddDiscrepancyOpen(true)}
                >
                    add discrepancy
                </button>
                <AddDiscrepancyForm isOpen={isAddDiscrepancyOpen} onClose={() => setIsAddDiscrepancyOpen(false)} />
            </div>

            {/* TABLES SECTION */}
            <div style={{ padding: '2em' }}>
                <h3>Open Work Orders</h3>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: 'solid 1px #000',
                    padding: '1em',
                    height: '40vh',
                    overflowY: 'auto',
                }}>
                    {workOrdersData.map((order) => (
                        <WorkOrder
                            order_id={order.id} 
                            id={order.id}
                            title={order.title}
                            created_by={order.created_by}
                            description={order.description}
                            part_needed={order.part_needed}
                            status={order.status}
                            created_at={order.created_at}
                            updated_at={order.updated_at}
                            due_by={order.due_by}
                            aircraft={order.aircraft}
                            tach_time={order.tach_time}
                            hobbs_time={order.hobbs_time}
                            ATA_code={order.ATA_code}
                            //TODO add components affected
                            components_image={order.components_image}
                            signed_by={order.signed_by}
                            signature={order.signature}
                            signature_date={order.signature_date}
                        />
                    ))}
                </div>

                <h3 style={{ marginTop: '2em' }}>Pending Discrepancies</h3>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: 'solid 1px #000',
                    padding: '1em',
                    height: '40vh',
                    overflowY: 'auto',
                }}>
                    {discrepanciesData.map((disc) => (
                        <Discrepancy
                            key={disc.id || disc.discrepancy_number}
                            discrepancy_number={disc.discrepancy_number}
                            part_number={disc.part_number}
                            aircraft={disc.aircraft}
                            description={disc.description}
                        />
                    ))}
                </div>
            </div>
        </>
    );
};

export default Maintenance;
