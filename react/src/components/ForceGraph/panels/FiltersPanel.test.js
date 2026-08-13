import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import graphReducer, { setEdgeFilterMode } from "../../../store/graphSlice";
import FiltersPanel from "./FiltersPanel";

const renderPanel = (modeOrOptions = "include") => {
  const options = typeof modeOrOptions === "string" ? { mode: modeOrOptions } : modeOrOptions;
  const { mode = "include", settings: settingsOverride = {}, ...propOverrides } = options;

  const store = configureStore({ reducer: { graph: graphReducer } });
  const dispatchSpy = jest.spyOn(store, "dispatch");
  const settings = {
    allCollections: [],
    allowedCollections: [],
    terminalCollections: [],
    edgeFilters: { Label: [] },
    edgeFilterModes: { Label: mode },
    ...settingsOverride,
  };
  render(
    <Provider store={store}>
      <FiltersPanel
        settings={settings}
        collectionMaps={new Map()}
        availableEdgeFilters={{ Label: { type: "categorical", values: ["DERIVES_FROM"] } }}
        edgeFilterStatus="succeeded"
        onCollectionChange={() => {}}
        onCollectionsClearAll={() => {}}
        onTerminalCollectionChange={() => {}}
        onTerminalCollectionsClearAll={() => {}}
        graphLinks={[{ Label: "DERIVES_FROM" }]}
        {...propOverrides}
      />
    </Provider>,
  );
  return { dispatchSpy };
};

describe("FiltersPanel section order", () => {
  it("renders sections in the order the query applies: Collections, Edge Filters, Stop traversal at", () => {
    renderPanel();

    const headings = screen.getAllByRole("heading", { level: 3 }).map((el) => el.textContent);

    expect(headings).toEqual(["Collection Filters:", "Edge Filters:", "Stop traversal at:"]);
  });
});

describe("FiltersPanel edge filter mode toggle", () => {
  it("toggling Exclude dispatches setEdgeFilterMode exclude", () => {
    const { dispatchSpy } = renderPanel("include");
    fireEvent.click(screen.getByRole("button", { name: /exclude/i }));
    expect(dispatchSpy).toHaveBeenCalledWith(
      setEdgeFilterMode({ field: "Label", mode: "exclude" }),
    );
  });

  it("renders an Include and an Exclude control for a categorical field", () => {
    renderPanel("include");
    expect(screen.getByRole("button", { name: /include/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exclude/i })).toBeInTheDocument();
  });

  it("marks Include active in include mode", () => {
    renderPanel("include");
    expect(screen.getByRole("button", { name: /^include$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /exclude/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("marks Exclude active in exclude mode", () => {
    renderPanel("exclude");
    expect(screen.getByRole("button", { name: /exclude/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^include$/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the dropdown placeholder stable regardless of mode", () => {
    // The placeholder is a stable handle (used by e2e locators); mode is shown
    // by the Include/Exclude toggle, not the dropdown label.
    renderPanel("exclude");
    expect(screen.getByPlaceholderText("Filter by Label...")).toBeInTheDocument();
  });

  it("shows the Include/Exclude toggle regardless of mode", () => {
    // Advanced (per-node) mode now applies edge-filter modes, so the toggle is
    // always rendered; both Include and Exclude controls must be present.
    renderPanel("include");
    expect(screen.getByRole("button", { name: /^include$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exclude/i })).toBeInTheDocument();
  });
});

describe("FiltersPanel terminal collections", () => {
  it("offers only currently allowed collections as terminal options", () => {
    renderPanel({
      settings: {
        allCollections: ["CS", "UBERON", "MONDO"],
        allowedCollections: ["CS", "UBERON"],
        terminalCollections: ["UBERON"],
      },
    });

    const group = screen.getByRole("group", { name: /stop traversal at/i });
    // The dropdown's option list only renders while open (onFocus sets isOpen),
    // and selected values also render as pills outside that list regardless of
    // open state. Focus the input first and scope assertions to .dropdown-list
    // so we prove the *option list* is sourced from allowedCollections, rather
    // than incidentally matching the "UBERON" pill (always present) or trivially
    // finding "MONDO" absent because the list was never opened.
    fireEvent.focus(within(group).getByPlaceholderText(/Filter by Terminal collections/i));
    const optionList = group.querySelector(".dropdown-list");
    expect(within(optionList).getByText("UBERON")).toBeInTheDocument();
    // MONDO is allowed nowhere, so it must not be offerable as terminal.
    expect(within(optionList).queryByText("MONDO")).not.toBeInTheDocument();
  });

  it("toggles a collection's terminal state", () => {
    const onTerminalCollectionChange = jest.fn();
    renderPanel({
      settings: {
        allCollections: ["CS", "UBERON"],
        allowedCollections: ["CS", "UBERON"],
        terminalCollections: [],
      },
      onTerminalCollectionChange,
    });

    const group = screen.getByRole("group", { name: /stop traversal at/i });
    fireEvent.focus(within(group).getByPlaceholderText(/Filter by Terminal collections/i));
    const optionList = group.querySelector(".dropdown-list");
    fireEvent.click(within(optionList).getByText("UBERON"));

    expect(onTerminalCollectionChange).toHaveBeenCalledWith("UBERON");
  });
});
