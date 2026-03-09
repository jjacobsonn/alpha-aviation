import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddDiscrepancyForm from '../../components/AddDiscrepancyForm';

describe('AddDiscrepancyForm', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render the form when isOpen is true', () => {
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Add Discrepancy')).toBeInTheDocument();
      expect(screen.getByLabelText('Discrepancy Number')).toBeInTheDocument();
    });

    test('should render all form fields', () => {
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText('Discrepancy Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Part Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Assigned To')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Reported')).toBeInTheDocument();
      expect(screen.getByLabelText('Tach Time')).toBeInTheDocument();
      expect(screen.getByLabelText('Hobbs Time')).toBeInTheDocument();
      expect(screen.getByLabelText('ATA Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Component Affected')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Attachment (file)')).toBeInTheDocument();
      expect(screen.getByLabelText('Digital Signature')).toBeInTheDocument();
    });

    test('should render submit and cancel buttons', () => {
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    test('should update text input values when user types', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      await user.type(orderNumberInput, 'DISC-001');
      
      expect(orderNumberInput).toHaveValue('DISC-001');
    });

    test('should update all text fields', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Component malfunction');
      
      expect(partNumberInput).toHaveValue('PN-12345');
      expect(assignedToInput).toHaveValue('John Doe');
      expect(descriptionInput).toHaveValue('Component malfunction');
    });

    test('should update date inputs', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const dueDateInput = screen.getByLabelText('Due Date');
      const dateReportedInput = screen.getByLabelText('Date Reported');
      
      await user.type(dueDateInput, '2026-03-15');
      await user.type(dateReportedInput, '2026-03-04');
      
      expect(dueDateInput).toHaveValue('2026-03-15');
      expect(dateReportedInput).toHaveValue('2026-03-04');
    });

    test('should handle file input', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const fileInput = screen.getByLabelText('Attachment (file)');
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      await user.upload(fileInput, file);
      
      expect(fileInput.files[0]).toBe(file);
      expect(fileInput.files[0].name).toBe('test.txt');
    });
  });

  describe('Form Validation', () => {
    test('should show error for missing order number', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Discrepancy number is required')).toBeInTheDocument();
      });
    });

    test('should show error for missing part number', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Part number is required')).toBeInTheDocument();
      });
    });

    test('should show error for missing assigned to field', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assigned-to is required')).toBeInTheDocument();
      });
    });

    test('should show error for missing description', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Description is required')).toBeInTheDocument();
      });
    });

    test('should not show errors when all required fields are filled', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/is required/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('should close modal on successful submission with valid data', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should reset form fields after successful submission', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(orderNumberInput).toHaveValue('');
        expect(partNumberInput).toHaveValue('');
        expect(assignedToInput).toHaveValue('');
        expect(descriptionInput).toHaveValue('');
      });
    });

    test('should not close modal on submission with invalid data', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cancel Button', () => {
    test('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should reset form when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      expect(orderNumberInput).toHaveValue('DISC-001');
      
      await user.click(cancelButton);
      
      expect(orderNumberInput).toHaveValue('');
    });
  });

  describe('Optional Fields', () => {
    test('should not require optional fields for submission', async () => {
      const user = userEvent.setup();
      render(<AddDiscrepancyForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Discrepancy Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'DISC-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
