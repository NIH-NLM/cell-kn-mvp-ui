import { fireEvent, render, screen } from "@testing-library/react";
import ResultsTable, { sortRows } from "components/WorkflowBuilder/ResultsTable";

const cellCount = (row) => row.cell_count;
const rows = [
  { _id: "CS/a", cell_count: "16,048" },
  { _id: "CS/b", cell_count: "551" },
  { _id: "CL/c", cell_count: undefined },
  { _id: "CS/d", cell_count: "4867" },
];
const ids = (result) => result.map((row) => row._id);

it("sorts counts numerically, keeps blanks last, and does not mutate", () => {
  expect(sortRows(rows, cellCount, null)).toBe(rows);
  expect(ids(sortRows(rows, cellCount, "asc"))).toEqual(["CS/b", "CS/d", "CS/a", "CL/c"]);
  expect(ids(sortRows(rows, cellCount, "desc"))).toEqual(["CS/a", "CS/d", "CS/b", "CL/c"]);
  expect(ids(rows)).toEqual(["CS/a", "CS/b", "CL/c", "CS/d"]);
});

it("cycles a header through ascending, descending, then traversal order", () => {
  const graphData = {
    nodes: [
      { _id: "CS/b", Name: "Ionocyte" },
      { _id: "CS/a", Name: "AT2" },
    ],
    links: [],
  };
  const labels = () =>
    screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.cells[2].textContent);

  render(<ResultsTable graphData={graphData} />);
  const original = labels();
  const header = screen.getByRole("button", { name: /Label/ });

  fireEvent.click(header);
  expect(labels()).toEqual([...original].sort());
  fireEvent.click(header);
  expect(labels()).toEqual([...original].sort().reverse());
  fireEvent.click(header);
  expect(labels()).toEqual(original);
});
