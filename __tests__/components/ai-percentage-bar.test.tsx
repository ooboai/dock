import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiPercentageBar } from "@/components/ai-percentage-bar";

describe("AiPercentageBar", () => {
  it("renders 0% AI correctly", () => {
    render(<AiPercentageBar percentage={0} />);
    expect(screen.getByText("0% AI")).toBeInTheDocument();
  });

  it("renders 50% AI correctly", () => {
    render(<AiPercentageBar percentage={50} />);
    expect(screen.getByText("50% AI")).toBeInTheDocument();
  });

  it("renders 100% AI correctly", () => {
    render(<AiPercentageBar percentage={100} />);
    expect(screen.getByText("100% AI")).toBeInTheDocument();
  });

  it("renders dash for null percentage", () => {
    render(<AiPercentageBar percentage={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders dash for undefined percentage", () => {
    render(<AiPercentageBar percentage={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("clamps values above 100", () => {
    render(<AiPercentageBar percentage={150} />);
    expect(screen.getByText("100% AI")).toBeInTheDocument();
  });

  it("clamps values below 0", () => {
    render(<AiPercentageBar percentage={-10} />);
    expect(screen.getByText("0% AI")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    render(<AiPercentageBar percentage={50} showLabel={false} />);
    expect(screen.queryByText("50% AI")).not.toBeInTheDocument();
  });
});
