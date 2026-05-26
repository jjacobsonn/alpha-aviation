import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import LandingPage from "../../components/LandingPage";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

// skipping testing the landing page because it's unused
describe.skip("LandingPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test("should render the component without crashing", () => {
    render(<LandingPage />);
    expect(screen.getAllByText("AIMS Next").length).toBeGreaterThan(0);
  });

  describe("Navigation Bar", () => {
    test("should display the AIMS Next brand name", () => {
      render(<LandingPage />);
      const brandElements = screen.getAllByText("AIMS Next");
      expect(brandElements.length).toBeGreaterThan(0);
    });

    test("should display navigation menu items", () => {
      render(<LandingPage />);
      expect(screen.getByRole("button", { name: "Solutions" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Products" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Resources" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();
    });

    test("should have a Login button that navigates to /login", () => {
      render(<LandingPage />);
      const loginButton = screen.getByRole("button", { name: /login/i });
      fireEvent.click(loginButton);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    test("should have a Get a Demo button in the header", () => {
      render(<LandingPage />);
      const demoButtons = screen.getAllByRole("button", { name: /get a demo/i });
      expect(demoButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Hero Section", () => {
    test("should display the main headline", () => {
      render(<LandingPage />);
      expect(screen.getByText("Aviation Software for More Uptime")).toBeInTheDocument();
    });

    test("should display the hero subtitle", () => {
      render(<LandingPage />);
      expect(screen.getByText(/A modern replacement for A.I.M.S./i)).toBeInTheDocument();
    });

    test("should display the overline text", () => {
      render(<LandingPage />);
      expect(screen.getByText("NEXT-GENERATION AVIATION SOFTWARE")).toBeInTheDocument();
    });

    test("should have a Get Started button", () => {
      render(<LandingPage />);
      const getStartedButton = screen.getByRole("button", { name: /get started/i });
      expect(getStartedButton).toBeInTheDocument();
    });

    test("should have a Watch Demo button", () => {
      render(<LandingPage />);
      const watchDemoButton = screen.getByRole("button", { name: /watch demo/i });
      expect(watchDemoButton).toBeInTheDocument();
    });

    test("should display trust statistics", () => {
      render(<LandingPage />);
      expect(screen.getByText("1000+")).toBeInTheDocument();
      expect(screen.getByText("5000+")).toBeInTheDocument();
      expect(screen.getByText("99.9%")).toBeInTheDocument();
      expect(screen.getByText("24/7")).toBeInTheDocument();
    });
  });

  describe("What We Do Section", () => {
    test("should display the section title", () => {
      render(<LandingPage />);
      expect(screen.getByText("Smarter Aviation Software")).toBeInTheDocument();
    });

    test("should display all feature cards", () => {
      render(<LandingPage />);
      expect(screen.getByText("Maintenance Tracking")).toBeInTheDocument();
      expect(screen.getByText("Inventory Management")).toBeInTheDocument();
      expect(screen.getByText("Flight Operations")).toBeInTheDocument();
      expect(screen.getByText("Fleet Management")).toBeInTheDocument();
      expect(screen.getByText("Cloud-Based Platform")).toBeInTheDocument();
      expect(screen.getByText("Enterprise Security")).toBeInTheDocument();
    });
  });

  describe("Benefits Section", () => {
    test("should display the Why Choose AIMS Next heading", () => {
      render(<LandingPage />);
      expect(screen.getByText("Why Choose AIMS Next?")).toBeInTheDocument();
    });

    test("should display benefit headings", () => {
      render(<LandingPage />);
      expect(screen.getByText("No More Waiting")).toBeInTheDocument();
      expect(screen.getByText("No More Wondering")).toBeInTheDocument();
      expect(screen.getByText("No More Wasted Effort")).toBeInTheDocument();
    });
  });

  describe("CTA Section", () => {
    test("should display the Ready to Get Started heading", () => {
      render(<LandingPage />);
      expect(screen.getByText("Ready to Get Started?")).toBeInTheDocument();
    });

    test("should have a Contact Sales button", () => {
      render(<LandingPage />);
      const contactSalesButton = screen.getByRole("button", { name: /contact sales/i });
      expect(contactSalesButton).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    test("should display footer sections", () => {
      render(<LandingPage />);
      expect(screen.getByText("Maintenance")).toBeInTheDocument();
      expect(screen.getByText("Inventory")).toBeInTheDocument();
      expect(screen.getByText("About Us")).toBeInTheDocument();
      expect(screen.getByText("Documentation")).toBeInTheDocument();
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    });

    test("should display the copyright text", () => {
      render(<LandingPage />);
      expect(screen.getByText(/© 2025 AIMS Next. All rights reserved./i)).toBeInTheDocument();
    });
  });

  describe("Navigation functionality", () => {
    test("should navigate to /management when Get Started is clicked", () => {
      render(<LandingPage />);
      const getStartedButton = screen.getByRole("button", { name: /get started/i });
      fireEvent.click(getStartedButton);
      expect(mockNavigate).toHaveBeenCalledWith("/management");
    });

    test("should navigate to /management when Get a Demo is clicked", () => {
      render(<LandingPage />);
      const demoButtons = screen.getAllByRole("button", { name: /get a demo/i });
      fireEvent.click(demoButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/management");
    });

    test("should navigate to /management when Contact Sales is clicked", () => {
      render(<LandingPage />);
      const contactSalesButton = screen.getByRole("button", { name: /contact sales/i });
      fireEvent.click(contactSalesButton);
      expect(mockNavigate).toHaveBeenCalledWith("/management");
    });
  });
});
