import { render, screen } from '@testing-library/react';
import KPICard from '../../components/KPICard';

describe('KPICard', () => {
  test('renders label, value, and icon', () => {
    render(
      <KPICard
        icon={<span data-testid="kpi-icon">kpi</span>}
        label="Open Work Orders"
        value="12"
      />
    );

    expect(screen.getByText('Open Work Orders')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
  });

  test('shows a placeholder while loading', () => {
    render(
      <KPICard
        icon={<span>kpi</span>}
        label="Open Work Orders"
        value="12"
        loading
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });
});