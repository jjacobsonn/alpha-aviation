import React, { useState } from 'react';

const WorkOrder = ({
    id, 
    title, 
    created_by, 
    description, 
    part_needed, 
    status, 
    created_at, 
    updated_at, 
    due_by, 
    aircraft, 
    tach_time, 
    hobbs_time, 
    ATA_code, 
    signed_by
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Dynamic color for the status pill
    const getStatusColor = () => {
        switch (status?.toLowerCase()) {
            case 'open': return 'var(--status-open)'; // Yellow
            case 'completed': return 'var(--status-completed)'; // Green
            case 'in progress': return 'var(--status-open)'; // Blue
            default: return '#eee';
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            margin: '1em 0',
            border: '1px solid #000',
            backgroundColor: '#f9f9f9',
            fontSize: '0.9em'
        }}>
            {/* Top Row: Primary Info */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ccc', backgroundColor: '#eee', alignItems: 'center' }}>
                <p style={{ padding: '0.7em', width: '15%', borderRight: '1px solid #ccc' }}><strong>WO #{id}</strong></p>
                <p style={{ padding: '0.7em', width: '20%', borderRight: '1px solid #ccc' }}><strong>Aircraft:</strong> {aircraft}</p>
                <p style={{ padding: '0.7em', width: '20%', borderRight: '1px solid #ccc' }}><strong>Part:</strong> {part_needed || 'None'}</p>
                <p style={{ padding: '0.7em', width: '20%', borderRight: '1px solid #ccc' }}><strong>Due:</strong> {due_by}</p>
                
                <div style={{ 
                    padding: '0.7em', 
                    width: '15%', 
                    textAlign: 'center', 
                    backgroundColor: getStatusColor(),
                    fontWeight: 'bold',
                    borderRight: '1px solid #ccc'
                }}>
                    {status?.toUpperCase()}
                </div>

                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        flex: 1,
                        padding: '0.7em',
                        cursor: 'pointer',
                        border: 'none',
                        backgroundColor: '#444',
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                >
                    {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Description Section */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                        <div style={{ padding: '1em', width: '15%', borderRight: '1px solid #eee', fontWeight: 'bold', backgroundColor: '#fff' }}>
                            Description:
                        </div>
                        <div style={{ padding: '1em', width: '85%', backgroundColor: '#fff' }}>
                            {description || "No description provided."}
                        </div>
                    </div>

                    {/* Technical Specs Row */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                        <p style={{ padding: '0.7em', width: '20%', borderRight: '1px solid #eee' }}><strong>Tach:</strong> {tach_time || 'N/A'}</p>
                        <p style={{ padding: '0.7em', width: '20%', borderRight: '1px solid #eee' }}><strong>Hobbs:</strong> {hobbs_time || 'N/A'}</p>
                        <p style={{ padding: '0.7em', width: '20%', borderRight: '1px solid #eee' }}><strong>ATA:</strong> {ATA_code || 'N/A'}</p>
                        <p style={{ padding: '0.7em', width: '20%', borderRight: '1px solid #eee' }}><strong>Signed:</strong> {signed_by || 'Unsigned'}</p>
                        <p style={{ padding: '0.7em', width: '20%' }}><strong>Modified:</strong> {updated_at}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrder;
