import { render, screen } from "@testing-library/react";
import CellCard from "./CellCard";

describe("CellCard", () => {
  it("renders the component correctly with a string label", () => {
    const cell = { label: "Cell Label", prop1: "value1", prop2: "value2" };
    render(<CellCard cell={cell} />);

    // Check if legend renders correctly
    expect(screen.getAllByText("Cell Label")[0]).toBeInTheDocument();

    // Check if table rows render correctly
    expect(screen.getAllByText("Cell Label")[1]).toBeInTheDocument(); //Cell label appears twice
    expect(screen.getByText("value1")).toBeInTheDocument();
    expect(screen.getByText("value2")).toBeInTheDocument();
  });

  it("renders the component correctly with an array as label", () => {
    const cell = { label: ["Label1", "Label2"], prop1: "value1" };
    render(<CellCard cell={cell} />);

    // Check if the label is joined correctly in the legend
    expect(screen.getByText("Label1+Label2")).toBeInTheDocument();
  });

  it("should not render table rows with keys that start with an underscore", () => {
    const cell = { label: "Cell Label", _hiddenProp: "shouldNotShow" };
    render(<CellCard cell={cell} />);

    // Ensure that properties starting with an underscore are not rendered
    expect(screen.queryByText("_hiddenProp")).toBeNull();
  });

  it("renders array values correctly", () => {
    const cell = { label: "Cell Label", prop1: ["value1", "value2"] };
    render(<CellCard cell={cell} />);

    // Check if array values are joined correctly in the table
    expect(screen.getByText("value1, value2")).toBeInTheDocument();
  });

  it("renders when cell is empty", () => {
    const cell = {};
    render(<CellCard cell={cell} />);

    // Ensure nothing breaks when the cell is empty
    expect(screen.queryByText("legend")).toBeNull();
  });
});
