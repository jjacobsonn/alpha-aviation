import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkOrder from '../../components/WorkOrder';

describe('WorkOrder', () => {
  const props = {
    id: 42,
    title: 'Inspect landing gear',
    created_by: 'Maintenance Lead',
    description: 'Inspect the left main landing gear assembly.',
    part_needed: '',
    status: 'open',
    created_at: '2026-05-01',
    updated_at: '2026-05-02',
    due_by: '2026-05-15',
    aircraft: 'N12345',
    tach_time: '1500.2',
    hobbs_time: '1498.8',
    ATA_code: '32-00-00',
    signed_by: 'J. Smith',
  };

  test('renders the collapsed summary row', () => {
    render(<WorkOrder {...props} />);

    expect(screen.getByText('WO #42')).toBeInTheDocument();
    expect(screen.getByText('Aircraft:')).toBeInTheDocument();
    expect(screen.getByText('N12345')).toBeInTheDocument();
    expect(screen.getByText('Part:')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Due:')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EXPAND' })).toBeInTheDocument();
    expect(screen.queryByText('Description:')).not.toBeInTheDocument();
  });

  test('expands and collapses the details panel', async () => {
    const user = userEvent.setup();

    render(<WorkOrder {...props} />);

    await user.click(screen.getByRole('button', { name: 'EXPAND' }));

    expect(screen.getByRole('button', { name: 'COLLAPSE' })).toBeInTheDocument();
    expect(screen.getByText('Description:')).toBeInTheDocument();
    expect(
      screen.getByText('Inspect the left main landing gear assembly.')
    ).toBeInTheDocument();
    expect(screen.getByText('Tach:')).toBeInTheDocument();
    expect(screen.getByText('1500.2')).toBeInTheDocument();
    expect(screen.getByText('Hobbs:')).toBeInTheDocument();
    expect(screen.getByText('1498.8')).toBeInTheDocument();
    expect(screen.getByText('ATA:')).toBeInTheDocument();
    expect(screen.getByText('32-00-00')).toBeInTheDocument();
    expect(screen.getByText('Signed:')).toBeInTheDocument();
    expect(screen.getByText('J. Smith')).toBeInTheDocument();
    expect(screen.getByText('Modified:')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'COLLAPSE' }));

    expect(screen.getByRole('button', { name: 'EXPAND' })).toBeInTheDocument();
    expect(screen.queryByText('Description:')).not.toBeInTheDocument();
  });
});