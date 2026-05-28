import { render, screen } from '@testing-library/react';
import Layout from '../../components/Layout';

jest.mock('../../components/NavigationDrawer', () => () => (
  <div data-testid="navigation-drawer">Navigation drawer</div>
));

jest.mock('../../components/search/SiteSearchDialog', () => () => (
  <div data-testid="site-search-dialog">Site search dialog</div>
));

jest.mock('../../components/search/SiteSearchTrigger', () => () => (
  <div data-testid="site-search-trigger">Site search trigger</div>
));

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