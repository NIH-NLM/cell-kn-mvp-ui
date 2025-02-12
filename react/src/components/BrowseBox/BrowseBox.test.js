import { render, screen, waitFor } from "@testing-library/react";
import BrowseBox from "./BrowseBox";
import * as utils from "../Utils/Utils";
import { MemoryRouter } from "react-router-dom";

// Mocking the fetchCollections and parseCollections functions
jest.mock("../Utils/Utils", () => ({
  fetchCollections: jest.fn(),
  parseCollections: jest.fn(),
}));

describe("BrowseBox", () => {
  beforeEach(() => {
    // Mock Utils
    const mockFetchedData = ["Collection 1", "Collection 2", "Collection 3"];
    utils.fetchCollections.mockResolvedValue(mockFetchedData);
    utils.parseCollections.mockImplementation((data) => data);
    // Render the BrowseBox with a Router wrapper and currentCollection prop
    render(
      <MemoryRouter>
        <BrowseBox currentCollection="Collection 2" />
      </MemoryRouter>,
    );
  });
  it("should render collections", async () => {
    // Check collections are rendered
    await waitFor(() => {
      expect(screen.getByText("Collection 1")).toBeInTheDocument();
      expect(screen.getByText("Collection 2")).toBeInTheDocument();
      expect(screen.getByText("Collection 3")).toBeInTheDocument();
    });
  });
  it("should highlight the active collection", async () => {
    // Check appropriate collection is highlighted
    await waitFor(() => {
      expect(screen.getByText("Collection 1").closest("a")).not.toHaveClass(
        "active",
      );
      expect(screen.getByText("Collection 2").closest("a")).toHaveClass(
        "active",
      );
      expect(screen.getByText("Collection 3").closest("a")).not.toHaveClass(
        "active",
      );
    });
  });

  it("should render links to each collection with correct href", async () => {
    // Check hrefs are populated correctly
    await waitFor(() => {
      expect(screen.getByText("Collection 1").closest("a")).toHaveAttribute(
        "href",
        "/browse/Collection 1",
      );
      expect(screen.getByText("Collection 2").closest("a")).toHaveAttribute(
        "href",
        "/browse/Collection 2",
      );
      expect(screen.getByText("Collection 3").closest("a")).toHaveAttribute(
        "href",
        "/browse/Collection 3",
      );
    });
  });
});
