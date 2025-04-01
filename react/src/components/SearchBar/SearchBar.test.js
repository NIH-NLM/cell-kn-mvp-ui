import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import SearchBar from "./SearchBar";

// Use fake timers for debounce and timeout testing
jest.useFakeTimers();

// Create mock functions for the props
const mockGenerateGraph = jest.fn();
const mockRemoveSelectedItem = jest.fn();
const mockAddSelectedItem = jest.fn();
const dummySelectedItems = [{ id: "item1" }, { id: "item2" }];

// Mock the child components to simplify testing
jest.mock("../SelectedItemsTable/SelectedItemsTable", () => (props) => (
  <div data-testid="selected-items-table">{JSON.stringify(props)}</div>
));

jest.mock("../SearchResultsTable/SearchResultsTable", () => (props) => (
  <div data-testid="search-results-table">
    {props.searchResults.map((item, index) => (
      <div
        key={index}
        data-testid="search-result-item"
        onClick={() => props.handleSelectItem(item)}
      >
        {item.label || item._id}
      </div>
    ))}
  </div>
));

describe("SearchBar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock global fetch to return a dummy search result
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([{ _id: "1", label: "Test Item 1" }]),
      }),
    );
  });

  it("renders the input field and child components", () => {
    render(
      <SearchBar
        generateGraph={mockGenerateGraph}
        selectedItems={dummySelectedItems}
        removeSelectedItem={mockRemoveSelectedItem}
        addSelectedItem={mockAddSelectedItem}
      />,
    );
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toBeInTheDocument();

    const selectedTable = screen.getByTestId("selected-items-table");
    expect(selectedTable).toBeInTheDocument();

    const resultsTable = screen.getByTestId("search-results-table");
    expect(resultsTable).toBeInTheDocument();
  });

  it("calls the API after debounce when input changes", async () => {
    render(
      <SearchBar
        generateGraph={mockGenerateGraph}
        selectedItems={dummySelectedItems}
        removeSelectedItem={mockRemoveSelectedItem}
        addSelectedItem={mockAddSelectedItem}
      />,
    );
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "test" } });

    // Advance timers by 150ms to trigger the debounce
    jest.advanceTimersByTime(150);

    // Wait for the fetch call to occur and verify it
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/arango_api/search/test?limit=100",
      ),
    );
  });

  it("shows search results on focus and hides them on mouse leave", async () => {
    render(
      <SearchBar
        generateGraph={mockGenerateGraph}
        selectedItems={dummySelectedItems}
        removeSelectedItem={mockRemoveSelectedItem}
        addSelectedItem={mockAddSelectedItem}
      />,
    );
    const input = screen.getByPlaceholderText("Search...");

    // The results container is the parent of the search results table
    const resultsContainer = screen.getByTestId(
      "search-results-table",
    ).parentElement;
    // Initially the container should not have the "show" class
    expect(resultsContainer).not.toHaveClass("show");

    // Focus on the input: should add the "show" class
    fireEvent.focus(input);
    expect(resultsContainer).toHaveClass("show");

    // Mouse leave the input: after 100ms the "show" class should be removed
    fireEvent.mouseLeave(input);
    act(() => {
      jest.advanceTimersByTime(101);
    });
    expect(resultsContainer).not.toHaveClass("show");
  });

  it("calls addSelectedItem when a search result is clicked", async () => {
    render(
      <SearchBar
        generateGraph={mockGenerateGraph}
        selectedItems={dummySelectedItems}
        removeSelectedItem={mockRemoveSelectedItem}
        addSelectedItem={mockAddSelectedItem}
      />,
    );
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "test" } });
    jest.advanceTimersByTime(150);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    // Wait for the search result to be rendered and simulate a click on it
    const searchResultItem = await screen.findByTestId("search-result-item");
    fireEvent.click(searchResultItem);
    expect(mockAddSelectedItem).toHaveBeenCalledWith({
      _id: "1",
      label: "Test Item 1",
    });
  });
});
