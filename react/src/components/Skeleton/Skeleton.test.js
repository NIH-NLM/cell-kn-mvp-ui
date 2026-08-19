import { render, screen } from "@testing-library/react";
import { SkeletonTable, SkeletonWrapper } from "./Skeleton";

describe("SkeletonWrapper", () => {
  it("renders as a div with role=status and aria-live=polite", () => {
    const { container } = render(
      <SkeletonWrapper>
        <SkeletonTable rows={1} columns={1} />
      </SkeletonWrapper>,
    );
    const wrapper = container.firstChild;
    expect(wrapper.tagName.toLowerCase()).toBe("div");
    expect(wrapper).toHaveAttribute("role", "status");
    expect(wrapper).toHaveAttribute("aria-live", "polite");
  });

  it("renders the default visually-hidden Loading... text", () => {
    render(
      <SkeletonWrapper>
        <SkeletonTable rows={1} columns={1} />
      </SkeletonWrapper>,
    );
    const hidden = screen.getByText("Loading...");
    expect(hidden).toHaveClass("visually-hidden");
  });

  it("renders a custom label when provided", () => {
    render(
      <SkeletonWrapper label="Fetching results...">
        <SkeletonTable rows={1} columns={1} />
      </SkeletonWrapper>,
    );
    expect(screen.getByText("Fetching results...")).toHaveClass("visually-hidden");
  });
});

describe("SkeletonTable", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<SkeletonTable />);
    const table = container.querySelector("table");
    expect(table).toHaveAttribute("aria-hidden", "true");
    expect(table).toHaveClass("skeleton-table");
  });

  it("renders the correct number of rows", () => {
    const { container } = render(<SkeletonTable rows={3} columns={2} />);
    const bodyRows = container.querySelectorAll("tbody tr");
    expect(bodyRows).toHaveLength(3);
  });

  it("renders the correct number of columns per row", () => {
    const { container } = render(<SkeletonTable rows={2} columns={4} />);
    const firstRowCells = container.querySelectorAll("tbody tr:first-child td");
    expect(firstRowCells).toHaveLength(4);
  });

  it("renders default 5 rows and 3 columns", () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(container.querySelectorAll("tbody tr:first-child td")).toHaveLength(3);
  });
});
