import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GraphContext } from "../../contexts";
import SearchPage from "./SearchPage";

// Stub NetworkStats (network) and SearchResultsTable (used inside the real SearchBar).
jest.mock("components/NetworkStats", () => () => <div data-testid="network-stats" />);
jest.mock("components/SearchResultsTable/SearchResultsTable", () => (props) => (
  <div data-testid="results">
    {props.searchResults?.map((r) => (
      <div key={r._id || r.label}>{r.label || r._id}</div>
    ))}
  </div>
));

jest.useFakeTimers();

const renderPage = () =>
  render(
    <MemoryRouter>
      <GraphContext.Provider value={{ graphType: "phenotypes" }}>
        <SearchPage />
      </GraphContext.Provider>
    </MemoryRouter>,
  );

test("renders the example chips and the stats row", () => {
  renderPage();
  expect(screen.getByRole("button", { name: /pericyte/i })).toBeInTheDocument();
  expect(screen.getByTestId("network-stats")).toBeInTheDocument();
});

test("clicking an example chip fills the search box", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: /KCNK3/i }));
  expect(screen.getByPlaceholderText(/search/i)).toHaveValue("KCNK3");
});

test("renders the About section with a Learn more link", () => {
  renderPage();
  expect(screen.getByRole("heading", { name: /about nlm-ckn/i })).toBeInTheDocument();
  expect(
    screen.getByText(/structured as a knowledge graph of biomedical entities/i),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /learn more/i })).toBeInTheDocument();
});
