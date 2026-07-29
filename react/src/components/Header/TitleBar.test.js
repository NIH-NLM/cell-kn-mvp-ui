import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TitleBar from "./TitleBar";

// Isolate: stub SearchBar so we assert only presence/absence, no search internals.
jest.mock("components/SearchBar/SearchBar", () => () => <div data-testid="global-search" />);

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TitleBar />
    </MemoryRouter>,
  );

describe("TitleBar", () => {
  it("shows the global search on non-home routes", () => {
    renderAt("/graph");
    expect(screen.getByTestId("global-search")).toBeInTheDocument();
  });

  it("hides the global search on the home/search route", () => {
    renderAt("/");
    expect(screen.queryByTestId("global-search")).toBeNull();
    // Brand still renders.
    expect(screen.getByText("NLM Cell Knowledge Network")).toBeInTheDocument();
  });
});
