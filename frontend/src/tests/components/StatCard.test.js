import { render, screen } from '@testing-library/react';
import StatCard from '../../components/StatCard';

describe('StatCard', () => {
  test('renders label, value, and optional icon', () => {
    render(
      <StatCard
        label="Critical Alerts"
        value="4"
        icon={<span data-testid="stat-icon">alert</span>}
      />
    );

    expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  test('shows a placeholder while loading', () => {
    render(<StatCard label="Critical Alerts" value="4" loading />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('4')).not.toBeInTheDocument();
  });
});