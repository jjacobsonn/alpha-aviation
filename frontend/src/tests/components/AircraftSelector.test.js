import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AircraftSelector from '../../components/AircraftSelector';

describe('AircraftSelector', () => {
  const options = [
    {
      id: 1,
      registration_number: 'N12345',
      model: 'C172',
      location: 'Phoenix',
      fleet_status: 'aog',
    },
    {
      id: 2,
      registration_number: 'N67890',
      model: 'B737',
      location: 'Dallas',
      fleet_status: 'maintenance_due',
    },
  ];

  test('renders the selected aircraft label and helper text', () => {
    render(
      <AircraftSelector
        label="Aircraft"
        value="2"
        options={options}
        helperText="Choose the aircraft for this work order"
      />
    );

    expect(screen.getByRole('combobox', { name: 'Aircraft' })).toHaveValue(
      'N67890 (B737) • Dallas'
    );
    expect(
      screen.getByText('Choose the aircraft for this work order')
    ).toBeInTheDocument();
  });

  test('calls onChange with the selected aircraft id', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <AircraftSelector
        label="Aircraft"
        value=""
        options={options}
        onChange={onChange}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'Aircraft' });
    await user.click(combobox);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('1');
  });

  test('respects the disabled prop', () => {
    render(
      <AircraftSelector
        label="Aircraft"
        value=""
        options={options}
        disabled
      />
    );

    expect(screen.getByRole('combobox', { name: 'Aircraft' })).toBeDisabled();
  });
});