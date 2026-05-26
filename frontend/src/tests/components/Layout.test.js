import { render, screen } from '@testing-library/react';

jest.mock('../../components/NavigationDrawer', () => () => (
  <div data-testid="navigation-drawer">Navigation drawer</div>
));

import Layout from '../../components/Layout';

describe('Layout', () => {
  test('renders the navigation drawer and children inside the main region', () => {
    render(
      <Layout>
        <div>Page content</div>
      </Layout>
    );

    expect(screen.getByTestId('navigation-drawer')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Page content');
  });
});