import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddWorkOrderForm from '../../components/AddWorkOrderForm';
import { getFieldError } from '../test-utils';

describe('AddWorkOrderForm', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render the form when isOpen is true', () => {
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Add Work Order')).toBeInTheDocument();
      expect(screen.getByLabelText('Order Number')).toBeInTheDocument();
    });

    test('should render all form fields', () => {
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText('Order Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Part Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Assigned To')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Reported')).toBeInTheDocument();
      expect(screen.getByLabelText('Tach Time')).toBeInTheDocument();
      expect(screen.getByLabelText('Hobbs Time')).toBeInTheDocument();
      expect(screen.getByLabelText('ATA Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Component Affected')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByText('Attachment (optional)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Digital Signature')).toBeInTheDocument();
    });

    test('should render submit and cancel buttons', () => {
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    test('should update text input values when user types', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      await user.type(orderNumberInput, 'WO-001');
      
      expect(orderNumberInput).toHaveValue('WO-001');
    });

    test('should update all text fields', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Engine inspection required');
      
      expect(partNumberInput).toHaveValue('PN-12345');
      expect(assignedToInput).toHaveValue('John Doe');
      expect(descriptionInput).toHaveValue('Engine inspection required');
    });

    test('should update date inputs', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const dueDateInput = screen.getByLabelText('Due Date');
      const dateReportedInput = screen.getByLabelText('Date Reported');
      
      await user.type(dueDateInput, '2026-03-15');
      await user.type(dateReportedInput, '2026-03-04');
      
      expect(dueDateInput).toHaveValue('2026-03-15');
      expect(dateReportedInput).toHaveValue('2026-03-04');
    });

    test('should handle file input', async () => {
      const user = userEvent.setup();
      const { container } = render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).not.toBeNull();

      const file = new File(['test content'], 'work-order.pdf', { type: 'application/pdf' });
      
      await user.upload(fileInput, file);
      
      expect(fileInput.files[0]).toBe(file);
      expect(fileInput.files[0].name).toBe('work-order.pdf');
    });

    test('should update numeric fields like tach time and hobbs time', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const tachTimeInput = screen.getByLabelText('Tach Time');
      const hobbsTimeInput = screen.getByLabelText('Hobbs Time');
      
      await user.type(tachTimeInput, '1500.5');
      await user.type(hobbsTimeInput, '2000.25');
      
      expect(tachTimeInput).toHaveValue('1500.5');
      expect(hobbsTimeInput).toHaveValue('2000.25');
    });
  });

  describe('Form Validation', () => {
    test('should show error for missing order number', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(getFieldError('Order Number', 'Order number is required')).toBeInTheDocument();
      });
    });

    test('should show error for missing part number', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(getFieldError('Part Number', 'Part number is required')).toBeInTheDocument();
      });
    });

    test('should show error for missing assigned to field', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(getFieldError('Assigned To', 'Assigned-to is required')).toBeInTheDocument();
      });
    });

    test('should show error for missing description', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(getFieldError('Description', 'Description is required')).toBeInTheDocument();
      });
    });

    test('should not show errors when all required fields are filled', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/is required/)).not.toBeInTheDocument();
      });
    });

    test('should show multiple validation errors at once', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(getFieldError('Order Number', 'Order number is required')).toBeInTheDocument();
        expect(getFieldError('Part Number', 'Part number is required')).toBeInTheDocument();
        expect(getFieldError('Assigned To', 'Assigned-to is required')).toBeInTheDocument();
        expect(getFieldError('Description', 'Description is required')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('should close modal on successful submission with valid data', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
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
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
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
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    test('should handle form submission with all fields populated', async () => {
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const dueDateInput = screen.getByLabelText('Due Date');
      const dateReportedInput = screen.getByLabelText('Date Reported');
      const tachTimeInput = screen.getByLabelText('Tach Time');
      const hobbsTimeInput = screen.getByLabelText('Hobbs Time');
      const ataCodeInput = screen.getByLabelText('ATA Code');
      const componentAffectedInput = screen.getByLabelText('Component Affected');
      const descriptionInput = screen.getByLabelText('Description');
      const signatureInput = screen.getByLabelText('Digital Signature');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      fireEvent.change(orderNumberInput, { target: { value: 'WO-001' } });
      fireEvent.change(partNumberInput, { target: { value: 'PN-12345' } });
      fireEvent.change(assignedToInput, { target: { value: 'John Doe' } });
      fireEvent.change(dueDateInput, { target: { value: '2026-03-15' } });
      fireEvent.change(dateReportedInput, { target: { value: '2026-03-04' } });
      fireEvent.change(tachTimeInput, { target: { value: '1500.5' } });
      fireEvent.change(hobbsTimeInput, { target: { value: '2000.25' } });
      fireEvent.change(ataCodeInput, { target: { value: '71-00-00' } });
      fireEvent.change(componentAffectedInput, { target: { value: 'Engine' } });
      fireEvent.change(descriptionInput, { target: { value: 'Complete engine inspection' } });
      fireEvent.change(signatureInput, { target: { value: 'John Doe' } });
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Cancel Button', () => {
    test('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should reset form when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await user.type(orderNumberInput, 'WO-001');
      expect(orderNumberInput).toHaveValue('WO-001');
      
      await user.click(cancelButton);
      
      expect(orderNumberInput).toHaveValue('');
    });

    test('should reset all fields when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await user.type(orderNumberInput, 'WO-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      await user.click(cancelButton);
      
      expect(orderNumberInput).toHaveValue('');
      expect(partNumberInput).toHaveValue('');
      expect(assignedToInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
    });
  });

  describe('Optional Fields', () => {
    test('should not require optional fields for submission', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should allow submission without due date', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
      await user.type(partNumberInput, 'PN-12345');
      await user.type(assignedToInput, 'John Doe');
      await user.type(descriptionInput, 'Test description');
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    test('should allow submission without attachment', async () => {
      const user = userEvent.setup();
      render(<AddWorkOrderForm isOpen={true} onClose={mockOnClose} />);
      
      const orderNumberInput = screen.getByLabelText('Order Number');
      const partNumberInput = screen.getByLabelText('Part Number');
      const assignedToInput = screen.getByLabelText('Assigned To');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await user.type(orderNumberInput, 'WO-001');
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
