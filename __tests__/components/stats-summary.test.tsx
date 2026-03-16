import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSummary } from "@/components/stats-summary";

const mockStats = {
  count: 42,
  added: 1500,
  deleted: 300,
  aiAdded: 1200,
  aiDeleted: 200,
  totalTokens: 150000,
};

describe("StatsSummary", () => {
  it("renders total anchor count", () => {
    render(<StatsSummary stats={mockStats} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Total Anchors")).toBeInTheDocument();
  });

  it("renders total tokens formatted", () => {
    render(<StatsSummary stats={mockStats} />);
    expect(screen.getByText("150.0K")).toBeInTheDocument();
    expect(screen.getByText("Total Tokens")).toBeInTheDocument();
  });

  it("renders lines changed", () => {
    render(<StatsSummary stats={mockStats} />);
    expect(screen.getByText("1.8K")).toBeInTheDocument();
    expect(screen.getByText("Lines Changed")).toBeInTheDocument();
  });

  it("renders AI vs Human code section", () => {
    render(<StatsSummary stats={mockStats} />);
    expect(screen.getByText("AI vs Human Code")).toBeInTheDocument();
  });

  it("renders added and deleted breakdown", () => {
    render(<StatsSummary stats={mockStats} />);
    expect(screen.getByText("+1.5K")).toBeInTheDocument();
    expect(screen.getByText("-300")).toBeInTheDocument();
  });

  it("renders zero stats without crashing", () => {
    const zeroStats = {
      count: 0,
      added: 0,
      deleted: 0,
      aiAdded: 0,
      aiDeleted: 0,
      totalTokens: 0,
    };
    render(<StatsSummary stats={zeroStats} />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});
