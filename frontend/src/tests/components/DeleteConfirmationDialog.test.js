import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog';

describe('DeleteConfirmationDialog', () => {
  test('renders the confirmation message and action buttons', () => {
    render(
      <DeleteConfirmationDialog
        open
        itemType="work order"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Are you sure you want to delete this work order? This action cannot be undone.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  test('calls the appropriate handlers when buttons are clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <DeleteConfirmationDialog
        open
        itemType="part"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('disables actions while loading', () => {
    render(
      <DeleteConfirmationDialog
        open
        itemType="part"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        isLoading
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});