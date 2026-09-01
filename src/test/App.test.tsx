import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { App, navigate } from "../app/App";

vi.mock("../landing/LandingPage", () => ({
  LandingPage: () => <main>Landing surface</main>,
}));

vi.mock("../demo/DemoPage", () => ({
  DemoPage: () => <main>Interactive demo</main>,
}));

beforeAll(() => {
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("application routing", () => {
  it("renders the landing page at the root and follows an in-app navigation to the demo", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(screen.getByRole("main")).toHaveTextContent("Landing surface");

    act(() => navigate("/demo"));

    expect(screen.getByRole("main")).toHaveTextContent("Interactive demo");
    expect(window.location.pathname).toBe("/demo");
  });

  it("restores the correct surface from browser history", () => {
    window.history.replaceState({}, "", "/demo");
    render(<App />);

    expect(screen.getByRole("main")).toHaveTextContent("Interactive demo");

    act(() => {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByRole("main")).toHaveTextContent("Landing surface");
  });
});
