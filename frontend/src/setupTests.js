// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('react-modal', () => {
  // mock setAppElement so it does nothing in the test environment (otherwise tests don't like to run)
  const Modal = ({ children }) => <div>{children}</div>;
  Modal.setAppElement = jest.fn();
  return Modal;
});