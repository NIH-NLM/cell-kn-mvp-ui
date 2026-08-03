import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import graphReducer from "store/graphSlice";
import savedGraphsReducer from "store/savedGraphsSlice";
import SavedGraphShelf from "./SavedGraphShelf";

const renderWithState = (originHistory, activeHistoryId = null) => {
  const store = configureStore({
    reducer: { graph: graphReducer, savedGraphs: savedGraphsReducer },
    preloadedState: { savedGraphs: { originHistory, activeHistoryId } },
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <SavedGraphShelf />
      </Provider>,
    ),
  };
};

const entry = (over = {}) => ({
  id: "1",
  originId: "CS/a",
  label: "Origin Label",
  thumbnail: null,
  subgraph: { nodes: [], links: [] },
  timestamp: "t",
  ...over,
});

describe("SavedGraphShelf", () => {
  it("renders an empty state when there is no history", () => {
    const { container } = renderWithState([]);
    expect(container.querySelector(".saved-graph-shelf--empty")).toBeInTheDocument();
  });

  it("renders the empty state without crashing when the array is undefined (stale rehydrate)", () => {
    const store = configureStore({
      reducer: { graph: graphReducer, savedGraphs: savedGraphsReducer },
      // Mimic a stale persisted blob that rehydrated without an originHistory array.
      preloadedState: { savedGraphs: { activeHistoryId: null } },
    });
    const { container } = render(
      <Provider store={store}>
        <SavedGraphShelf />
      </Provider>,
    );
    expect(container.querySelector(".saved-graph-shelf--empty")).toBeInTheDocument();
  });

  it("renders a card per history entry and highlights the active one", () => {
    const { container } = renderWithState(
      [entry({ id: "1" }), entry({ id: "2", label: "Second" })],
      "2",
    );
    expect(screen.getByText("Origin Label")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(container.querySelectorAll(".saved-graph-card--active")).toHaveLength(1);
  });

  it("restores a history entry when its card is clicked", () => {
    const { store } = renderWithState([entry({ id: "1" })]);
    fireEvent.click(screen.getByText("Origin Label"));
    expect(store.getState().savedGraphs.activeHistoryId).toBe("1");
  });

  it("restores a history entry when its thumbnail is clicked", () => {
    const { container, store } = renderWithState([entry({ id: "1" })]);
    fireEvent.click(container.querySelector(".saved-graph-card-thumb"));
    expect(store.getState().savedGraphs.activeHistoryId).toBe("1");
  });

  it("deletes a history entry via its delete control", () => {
    const { store } = renderWithState([entry({ id: "1" })]);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(store.getState().savedGraphs.originHistory).toHaveLength(0);
  });

  it("folds the capture time into the restore button's accessible name so repeated origins are distinguishable", () => {
    const timestamp = "2026-07-29T15:04:05.000Z";
    const capturedAt = new Date(timestamp).toLocaleString();
    renderWithState([entry({ label: "pericyte", timestamp })]);
    const [restoreButton] = screen.getAllByRole("button", {
      name: `Restore pericyte, captured ${capturedAt}`,
    });
    // The title stays as a hover affordance for sighted users, but the
    // accessible name is what actually reaches assistive tech.
    expect(restoreButton.closest(".saved-graph-card")).toHaveAttribute("title", capturedAt);
  });

  it("falls back to the plain restore label when an entry has no timestamp", () => {
    renderWithState([entry({ label: "pericyte", timestamp: undefined })]);
    expect(screen.getAllByRole("button", { name: "Restore pericyte" })).toHaveLength(2);
  });

  it("falls back to the plain restore label when the timestamp doesn't parse into a valid date", () => {
    const { container } = renderWithState([entry({ label: "pericyte", timestamp: "t" })]);
    expect(screen.getAllByRole("button", { name: "Restore pericyte" })).toHaveLength(2);
    expect(container.querySelector(".saved-graph-card")).not.toHaveAttribute("title");
  });

  it("gives the title button the same capture-aware accessible name as the thumbnail button", () => {
    const timestamp = "2026-07-29T15:04:05.000Z";
    const capturedAt = new Date(timestamp).toLocaleString();
    renderWithState([entry({ label: "pericyte", timestamp })]);
    const expectedName = `Restore pericyte, captured ${capturedAt}`;
    const restoreButtons = screen.getAllByRole("button", { name: expectedName });
    expect(restoreButtons).toHaveLength(2);
    const titleButton = restoreButtons.find((button) =>
      button.classList.contains("saved-graph-card-title"),
    );
    expect(titleButton).toBeTruthy();
    // Visible text stays the plain label for sighted users.
    expect(titleButton).toHaveTextContent("pericyte");
  });
});
