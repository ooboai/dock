import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthorTypeBadge } from "@/components/author-type-badge";

describe("AuthorTypeBadge", () => {
  it("renders agent badge", () => {
    render(<AuthorTypeBadge type="agent" />);
    const badge = screen.getByText("agent");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-foreground");
  });

  it("renders assisted badge", () => {
    render(<AuthorTypeBadge type="assisted" />);
    const badge = screen.getByText("assisted");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-foreground/80");
  });

  it("renders human badge", () => {
    render(<AuthorTypeBadge type="human" />);
    const badge = screen.getByText("human");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-muted-foreground/20");
  });

  it("renders automated badge", () => {
    render(<AuthorTypeBadge type="automated" />);
    const badge = screen.getByText("automated");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-muted");
  });

  it("renders unknown for null type", () => {
    render(<AuthorTypeBadge type={null} />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });

  it("handles case-insensitive types", () => {
    render(<AuthorTypeBadge type="Agent" />);
    const badge = screen.getByText("Agent");
    expect(badge.className).toContain("bg-foreground");
  });
});
