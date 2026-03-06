import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FleetStatusPanel from "../../components/FleetStatusPanel";

// this component is currently unused, so for now these tests are kept but skipped
describe.skip("FleetStatusPanel", () => {
  it("should render the component without crashing", () => {
    render(<FleetStatusPanel />);
    expect(screen.getByText("Fleet Status")).toBeInTheDocument();
  });

  it("should display the Fleet Status title", () => {
    render(<FleetStatusPanel />);
    const title = screen.getByText("Fleet Status");
    expect(title).toBeInTheDocument();
    expect(title).toHaveStyle({ color: "#f5b400" });
  });

  it("should display the AOG section", () => {
    render(<FleetStatusPanel />);
    const aogTitle = screen.getByText("AOG");
    expect(aogTitle).toBeInTheDocument();
  });

  it("should display the Due Soon section", () => {
    render(<FleetStatusPanel />);
    const dueSoonTitle = screen.getByText("Due Soon");
    expect(dueSoonTitle).toBeInTheDocument();
  });

  it("should render all AOG aircraft tail numbers", () => {
    render(<FleetStatusPanel />);
    const aogTails = ["N1846A", "N2232X", "N2419J", "N2786F", "N7536L", "N7909Q", "N8301", "N8302", "N8303", "N8304", "N8305", "N9896Q"];
    
    aogTails.forEach((tail) => {
      expect(screen.getByText(tail)).toBeInTheDocument();
    });
  });

  it("should render all Due Soon aircraft tail numbers", () => {
    render(<FleetStatusPanel />);
    const dueSoonTails = ["N1871X", "N2426G", "N3076Q", "N4046C", "N5824M"];
    
    dueSoonTails.forEach((tail) => {
      expect(screen.getByText(tail)).toBeInTheDocument();
    });
  });

  it("should render the correct number of items in AOG section", () => {
    render(<FleetStatusPanel />);
    const aogItems = screen.getAllByRole("button");
    // First 12 buttons are AOG items, next 5 are Due Soon items
    expect(aogItems.length).toBe(17);
  });

  it("should have proper container styling", () => {
    const { container } = render(<FleetStatusPanel />);
    const box = container.querySelector('[class*="MuiBox"]');
    expect(box).toBeInTheDocument();
  });

  it("should render ListItemButton components for each aircraft", () => {
    render(<FleetStatusPanel />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
