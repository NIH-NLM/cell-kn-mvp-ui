import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchResultsTable from "./SearchResultsTable";

describe("SearchResultsTable", () => {
  const sampleResults = {
    fruits: [
      { label: "Apple", term: "apple" },
      { label: "Banana", term: "banana" },
    ],
    vegetables: [{ label: "Carrot", term: "carrot" }],
    dairy: [{ term: "milk" }],
    empty: [], // This key should be filtered out.
  };

  const handleSelectItem = jest.fn();

  beforeEach(() => {
    handleSelectItem.mockClear();
  });

  test("renders headers and toggles expansion to show items", () => {
    render(
      <SearchResultsTable
        searchResults={sampleResults}
        handleSelectItem={handleSelectItem}
      />,
    );

    // Only non-empty keys should be rendered as headers.
    expect(screen.getByText("fruits")).toBeInTheDocument();
    expect(screen.getByText("vegetables")).toBeInTheDocument();
    expect(screen.getByText("dairy")).toBeInTheDocument();
    expect(screen.queryByText("empty")).not.toBeInTheDocument();

    // Initially, items should not be visible (collapsed)
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.queryByText("Carrot")).not.toBeInTheDocument();
    expect(screen.queryByText("milk")).not.toBeInTheDocument();

    // Click on the "fruits" header to expand it
    fireEvent.click(screen.getByText("fruits"));
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Banana")).toBeInTheDocument();

    // Expand "vegetables" header
    fireEvent.click(screen.getByText("vegetables"));
    expect(screen.getByText("Carrot")).toBeInTheDocument();

    // Expand "dairy" header
    fireEvent.click(screen.getByText("dairy"));
    expect(screen.getByText("milk")).toBeInTheDocument();
  });

  test("calls handleSelectItem when an item is clicked", () => {
    render(
      <SearchResultsTable
        searchResults={sampleResults}
        handleSelectItem={handleSelectItem}
      />,
    );

    // Expand the "fruits" header first so that its items are visible.
    fireEvent.click(screen.getByText("fruits"));

    // Click on "Apple"
    fireEvent.click(screen.getByText("Apple"));
    expect(handleSelectItem).toHaveBeenCalledWith({
      label: "Apple",
      term: "apple",
    });

    // Expand the "vegetables" header and click on "Carrot"
    fireEvent.click(screen.getByText("vegetables"));
    fireEvent.click(screen.getByText("Carrot"));
    expect(handleSelectItem).toHaveBeenCalledWith({
      label: "Carrot",
      term: "carrot",
    });
  });
});
