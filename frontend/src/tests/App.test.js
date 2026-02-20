import { render } from '@testing-library/react';
import App from '../App';

jest.mock('react-modal', () => {
  // mock setAppElement so it does nothing in the test environment
  const Modal = ({ children }) => <div>{children}</div>;
  Modal.setAppElement = jest.fn();
  return Modal;
});

test('renders without crashing', () => {
  render(<App />);
});