import { fireEvent, render, screen } from "@testing-library/react";
import ExampleSearches from "./ExampleSearches";

// Stub the icon so we can assert one renders per chip without a real FA glyph.
jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: ({ icon }) => <span data-testid="fa-icon" data-icon={icon?.name ?? "x"} />,
}));

const EXAMPLES = [
  { term: "pericyte", type: "Cell type", icon: { name: "microscope" } },
  { term: "KCNK3", type: "Gene", icon: { name: "dna" } },
];

test("renders a chip per example with an icon and the term (type is in the title, not shown)", () => {
  render(<ExampleSearches examples={EXAMPLES} onPick={() => {}} />);
  const pericyte = screen.getByRole("button", { name: /pericyte/i });
  expect(pericyte).toBeInTheDocument();
  expect(pericyte).toHaveAttribute("title", "pericyte — Cell type");
  expect(screen.getByRole("button", { name: /KCNK3/i })).toBeInTheDocument();
  // One icon per chip; the entity type is NOT rendered as visible text.
  expect(screen.getAllByTestId("fa-icon")).toHaveLength(2);
  expect(screen.queryByText("Cell type")).toBeNull();
});

test("clicking a chip calls onPick with its term", () => {
  const onPick = jest.fn();
  render(<ExampleSearches examples={EXAMPLES} onPick={onPick} />);
  fireEvent.click(screen.getByRole("button", { name: /pericyte/i }));
  expect(onPick).toHaveBeenCalledWith("pericyte");
});

test("renders nothing when there are no examples", () => {
  const { container } = render(<ExampleSearches examples={[]} onPick={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
