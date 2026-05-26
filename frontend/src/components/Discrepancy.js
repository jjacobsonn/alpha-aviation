import React from 'react';

const Discrepancy = ({
    id,
    date_reported,
    description,
    ata_code,
    tach_time,
    status,
    work_order,
    aircraft,
    reporter
}) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            margin: '0.5em 0',
            border: '1px solid #000',
            backgroundColor: '#f9f9f9',
            fontSize: '0.9em'
        }}>
            {/* Top Row: Meta Data */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ccc', backgroundColor: '#eee' }}>
                <p style={{ padding: '0.5em', width: '10%', borderRight: '1px solid #ccc' }}><strong>ID:</strong> {id}</p>
                <p style={{ padding: '0.5em', width: '20%', borderRight: '1px solid #ccc' }}><strong>Date:</strong> {date_reported}</p>
                <p style={{ padding: '0.5em', width: '15%', borderRight: '1px solid #ccc' }}><strong>Aircraft:</strong> {aircraft}</p>
                <p style={{ padding: '0.5em', width: '15%', borderRight: '1px solid #ccc' }}><strong>ATA:</strong> {ata_code || 'N/A'}</p>
                <p style={{ padding: '0.5em', width: '20%', borderRight: '1px solid #ccc' }}><strong>Tach:</strong> {tach_time || '---'}</p>
                <p style={{ 
                    padding: '0.5em', 
                    width: '20%', 
                    textAlign: 'center',
                    backgroundColor: status === 'pending' ? 'var(--status-pending)' : '#d4edda',
                    fontWeight: 'bold'
                }}>
                    {status.toUpperCase()}
                </p>
            </div>

            {/* Bottom Row: Description */}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ padding: '1em', width: '15%', borderRight: '1px solid #ccc', fontWeight: 'bold' }}>
                    Description:
                </div>
                <div style={{ padding: '1em', width: '85%' }}>
                    {description || "No description provided."}
                </div>
            </div>

            {/* Footer: Linked Data */}
            <div style={{ display: 'flex', borderTop: '1px solid #eee', fontSize: '0.8em', color: '#666' }}>
                <p style={{ padding: '0.3em 1em' }}>Linked Work Order: #{work_order}</p>
                <p style={{ padding: '0.3em 1em' }}>Reported By: {reporter || 'System'}</p>
            </div>
        </div>
    );
};

export default Discrepancy;
