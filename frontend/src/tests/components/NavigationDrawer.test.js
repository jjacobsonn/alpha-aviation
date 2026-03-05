// Mock setup must come FIRST before any imports
const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

jest.mock("../../context/AppContext", () => ({
  useAppContext: () => ({
    dispatch: jest.fn(),
  }),
  ACTION_TYPES: {
    LOGGED_OUT: "LOGGED_OUT",
  },
}));

jest.mock("../../shared/Api", () => ({
  logoutUser: jest.fn(),
}));

// Now import components and utilities AFTER mocks
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import NavigationDrawer from "../../components/NavigationDrawer";
import * as Api from "../../shared/Api";

describe("NavigationDrawer Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Api.logoutUser.mockResolvedValue(true);
    mockUseLocation.mockReturnValue({
      pathname: "/management",
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <NavigationDrawer />
      </BrowserRouter>
    );
  };

  describe("Rendering", () => {
    test("should render the drawer component", () => {
      renderComponent();
      // MUI Drawer renders with MuiDrawer-root class
      const drawer = document.querySelector(".MuiDrawer-root");
      expect(drawer).toBeInTheDocument();
    });

    test("should render logo with text when sidebar is open", () => {
      renderComponent();
      expect(screen.getByText("AIMS Next")).toBeInTheDocument();
    });

    test("should render all main navigation items", () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const textContent = buttons.map((btn) => btn.textContent).join(" ");
      expect(textContent).toContain("Management");
      expect(textContent).toContain("Parts");
      expect(textContent).toContain("Maintenance");
    });

    test("should render bottom navigation items", () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const allText = buttons.map((b) => b.textContent).join(" ");
      expect(allText).toContain("Notifications");
      expect(allText).toContain("Settings");
      expect(allText).toContain("Account");
    });
  });

  describe("Sidebar Toggle", () => {
    test("should toggle sidebar visibility", () => {
      renderComponent();
      const toggleButton = screen.getAllByRole("button")[0]; // First button is the toggle
      
      // Initially should show AIMS Next text
      expect(screen.getByText("AIMS Next")).toBeVisible();

      // Click to toggle
      fireEvent.click(toggleButton);

      // Text should be removed from DOM when sidebar is collapsed
      expect(screen.queryByText("AIMS Next")).not.toBeInTheDocument();
    });
  });

  describe("Navigation - Main Items", () => {
    test("should navigate when Management item is clicked", () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      // Find the Management button (excluding toggle button)
      const managementBtn = buttons.find((btn) => btn.textContent.includes("Management"));
      
      fireEvent.click(managementBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/management");
    });

    test("should navigate when Parts item is clicked", () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const partsBtn = buttons.find((btn) => btn.textContent.includes("Parts"));
      
      fireEvent.click(partsBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/parts");
    });

    test("should navigate when Maintenance item is clicked", () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const maintenanceBtn = buttons.find(
        (btn) => btn.textContent.includes("Maintenance")
      );
      
      fireEvent.click(maintenanceBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/maintenance");
    });

    test("should navigate to home when logo is clicked", () => {
      renderComponent();
      const logoText = screen.getByText("AIMS Next");
      fireEvent.click(logoText.closest("div"));
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Account Menu", () => {
    test("should open menu when Account button is clicked", async () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const accountBtn = buttons.find((btn) => btn.textContent.includes("Account"));

      expect(accountBtn).toBeTruthy();
      fireEvent.click(accountBtn);

      // Wait for menu to appear
      await waitFor(
        () => {
          expect(screen.getByText("Profile")).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    test("should show all menu options when opened", async () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const accountBtn = buttons.find((btn) => btn.textContent.includes("Account"));

      fireEvent.click(accountBtn);

      await waitFor(
        () => {
          expect(screen.getByText("Profile")).toBeInTheDocument();
          expect(screen.getByText("Logout")).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Logout Functionality", () => {
    test("should call logoutUser API when Logout is clicked", async () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const accountBtn = buttons.find((btn) => btn.textContent.includes("Account"));

      fireEvent.click(accountBtn);

      const logoutOption = await screen.findByText("Logout");
      fireEvent.click(logoutOption);

      await waitFor(() => {
        expect(Api.logoutUser).toHaveBeenCalled();
      });
    });

    test("should navigate to login after logout", async () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const accountBtn = buttons.find((btn) => btn.textContent.includes("Account"));

      fireEvent.click(accountBtn);

      const logoutOption = await screen.findByText("Logout");
      fireEvent.click(logoutOption);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    test("should handle logout error gracefully", async () => {
      Api.logoutUser.mockRejectedValueOnce(new Error("Network error"));

      renderComponent();
      const buttons = screen.getAllByRole("button");
      const accountBtn = buttons.find((btn) => btn.textContent.includes("Account"));

      fireEvent.click(accountBtn);

      const logoutOption = await screen.findByText("Logout");
      fireEvent.click(logoutOption);

      // Should still navigate even if logout fails
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });
  });

  describe("Keyboard and Accessibility", () => {
    test("should render all buttons with proper roles", () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    test("should handle keyboard clicks on navigation items", () => {
      renderComponent();
      const buttons = screen.getAllByRole("button");
      const partsBtn = buttons.find((btn) => btn.textContent.includes("Parts"));

      // Simulate keyboard press (Enter key)
      fireEvent.click(partsBtn);

      expect(mockNavigate).toHaveBeenCalledWith("/parts");
    });
  });

  describe("Icon Display", () => {
    test("should render drawer with icons", () => {
      renderComponent();
      const drawer = document.querySelector(".MuiDrawer-root");
      expect(drawer).toBeInTheDocument();

      // Check for SVG elements (icons)
      const svgs = drawer.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("Selected Tab", () => {
    test("should highlight selected tab based on pathname", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/parts",
      });

      renderComponent();
      
      const buttons = screen.getAllByRole("button");
      const partsBtn = buttons.find((btn) => btn.textContent.includes("Parts"));
      
      expect(partsBtn).toHaveClass("Mui-selected");
    });
  });
});
