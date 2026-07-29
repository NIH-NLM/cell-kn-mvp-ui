import { render, screen, waitFor } from "@testing-library/react";
import { GraphContext } from "../../contexts";
import NetworkStats from "./NetworkStats";

jest.mock("services", () => ({
  fetchCollectionCount: jest.fn(),
}));

import { fetchCollectionCount } from "services";

const renderStats = () =>
  render(
    <GraphContext.Provider value={{ graphType: "phenotypes" }}>
      <NetworkStats />
    </GraphContext.Provider>,
  );

beforeEach(() => jest.clearAllMocks());

test("renders a labeled card with a formatted count per stat", async () => {
  fetchCollectionCount.mockImplementation((key) =>
    Promise.resolve({ CS: 1234, CL: 56, GS: 20000, PUB: 42, CSD: 7 }[key] ?? 0),
  );
  renderStats();
  await waitFor(() => expect(screen.getByText("1,234")).toBeInTheDocument());
  expect(screen.getByText("Cell sets")).toBeInTheDocument();
  expect(screen.getByText("20,000")).toBeInTheDocument();
  expect(screen.getByText("Genes")).toBeInTheDocument();
});

test("a failed stat does not throw or block the others", async () => {
  fetchCollectionCount.mockImplementation((key) =>
    key === "GS" ? Promise.reject(new Error("boom")) : Promise.resolve(99),
  );
  renderStats();
  // Other stats still render their count.
  await waitFor(() => expect(screen.getAllByText("99").length).toBeGreaterThan(0));
  // The failed stat shows a dash, not a number, and the app didn't crash.
  expect(screen.getByText("Genes")).toBeInTheDocument();
});

test("clears prior counts when graphType changes so stale numbers aren't shown", async () => {
  fetchCollectionCount.mockResolvedValue(5);
  const { rerender } = render(
    <GraphContext.Provider value={{ graphType: "phenotypes" }}>
      <NetworkStats />
    </GraphContext.Provider>,
  );
  await waitFor(() => expect(screen.getAllByText("5").length).toBe(5));

  // Switch graph; the new fetches stay pending during this window.
  fetchCollectionCount.mockImplementation(() => new Promise(() => {}));
  rerender(
    <GraphContext.Provider value={{ graphType: "ontologies" }}>
      <NetworkStats />
    </GraphContext.Provider>,
  );
  // The prior graph's counts are cleared to dashes rather than lingering.
  await waitFor(() => expect(screen.queryByText("5")).toBeNull());
  expect(screen.getAllByText("—").length).toBe(5);
});
