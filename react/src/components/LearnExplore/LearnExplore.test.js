import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LearnExplore from "./LearnExplore";

describe("LearnExplore", () => {
  it("renders both links with correct routes", () => {
    render(
      <MemoryRouter>
        <LearnExplore />
      </MemoryRouter>,
    );
    const schema = screen.getByRole("link", { name: /Knowledge Graph Schema/i });
    const about = screen.getByRole("link", { name: /How to explore NLM-CKN/i });
    expect(schema).toHaveAttribute("href", "/schema");
    expect(about).toHaveAttribute("href", "/about");
  });

  it("renders the info-icon header", () => {
    render(
      <MemoryRouter>
        <LearnExplore />
      </MemoryRouter>,
    );
    expect(screen.getByText("Learn & Explore")).toBeInTheDocument();
  });
});
