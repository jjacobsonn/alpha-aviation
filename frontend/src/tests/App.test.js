import { render } from '@testing-library/react';
import App from '../App';

jest.mock('../shared/Api', () => ({
  makeApiRequest: jest.fn(() => Promise.resolve({}))
}));

test('renders without crashing', () => {
  render(<App />);
});