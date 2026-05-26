import { render, screen } from '@testing-library/react';
import Discrepancy from '../../components/Discrepancy';

describe('Discrepancy', () => {
  const props = {
    id: 17,
    date_reported: '2026-05-03',
    description: 'Fuel cap seal is worn.',
    ata_code: '',
    tach_time: '',
    status: 'pending',
    work_order: 42,
    aircraft: 'N12345',
    reporter: '',
  };

  test('renders the discrepancy details and fallback values', () => {
    render(<Discrepancy {...props} />);

    expect(screen.getByText('ID:')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('Date:')).toBeInTheDocument();
    expect(screen.getByText('2026-05-03')).toBeInTheDocument();
    expect(screen.getByText('Aircraft:')).toBeInTheDocument();
    expect(screen.getByText('N12345')).toBeInTheDocument();
    expect(screen.getByText('ATA:')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('Tach:')).toBeInTheDocument();
    expect(screen.getByText('---')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('Description:')).toBeInTheDocument();
    expect(screen.getByText('Fuel cap seal is worn.')).toBeInTheDocument();
    expect(screen.getByText('Linked Work Order: #42')).toBeInTheDocument();
    expect(screen.getByText('Reported By: System')).toBeInTheDocument();
  });
});