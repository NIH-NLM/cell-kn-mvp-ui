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

  test("renders a table with correct headers and rows", () => {
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

    // With three headers, they all fall into one table chunk.
    const tables = screen.getAllByRole("table");
    expect(tables.length).toBe(1);

    // The maximum length among the lists is 2 (fruits has 2 items).
    const rows = tables[0].querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    // First row should render: Apple, Carrot, milk.
    const firstRowCells = rows[0].querySelectorAll("td");
    expect(firstRowCells[0].textContent).toBe("Apple");
    expect(firstRowCells[1].textContent).toBe("Carrot");
    expect(firstRowCells[2].textContent).toBe("milk");

    // Second row: Banana and two empty cells.
    const secondRowCells = rows[1].querySelectorAll("td");
    expect(secondRowCells[0].textContent).toBe("Banana");
    expect(secondRowCells[1].textContent).toBe("");
    expect(secondRowCells[2].textContent).toBe("");
  });

  test("calls handleSelectItem when a table cell is clicked", () => {
    render(
      <SearchResultsTable
        searchResults={sampleResults}
        handleSelectItem={handleSelectItem}
      />,
    );

    // Click on the cell with "Apple"
    fireEvent.click(screen.getByText("Apple"));
    expect(handleSelectItem).toHaveBeenCalledWith({
      label: "Apple",
      term: "apple",
    });

    // Click on the cell with "Carrot"
    fireEvent.click(screen.getByText("Carrot"));
    expect(handleSelectItem).toHaveBeenCalledWith({
      label: "Carrot",
      term: "carrot",
    });
  });
});
