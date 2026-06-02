import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import SiteAdminPortal from "../../pages/SiteAdminPortal";

jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => jest.fn(),
}));

jest.mock("../../shared/Api", () => ({
  fetchCompanies: jest.fn(() => Promise.resolve([])),
  fetchProfilesForSiteAdmin: jest.fn(() => Promise.resolve([])),
  fetchAircraftForSiteAdmin: jest.fn(() => Promise.resolve([])),
  fetchFlightsForSiteAdmin: jest.fn(() => Promise.resolve([])),
  fetchPartsForSiteAdmin: jest.fn(() => Promise.resolve([])),
  fetchInventoriesForSiteAdmin: jest.fn(() => Promise.resolve([])),
  fetchWorkordersForSiteAdmin: jest.fn(() => Promise.resolve([])),
  fetchDiscrepanciesForSiteAdmin: jest.fn(() => Promise.resolve([])),
}));

test("Site admin portal renders heading and pagination bars", async () => {
  render(
    <MemoryRouter>
      <SiteAdminPortal />
    </MemoryRouter>
  );

  expect(await screen.findByText(/Site Admin/i)).toBeInTheDocument();
  expect(screen.getAllByText("No rows").length).toBeGreaterThanOrEqual(8);
});
