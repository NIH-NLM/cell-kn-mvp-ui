import { render, screen } from "@testing-library/react";
import DocumentCard from "./DocumentCard";

describe("DocumentCard", () => {
  it("renders the component correctly with a string label", () => {
    const document = { label: "Document Label", prop1: "value1", prop2: "value2" };
    render(<DocumentCard document={document} />);

    // Check if legend renders correctly
    expect(screen.getAllByText("Document Label")[0]).toBeInTheDocument();

    // Check if table rows render correctly
    expect(screen.getAllByText("Document Label")[1]).toBeInTheDocument(); //Document label appears twice
    expect(screen.getByText("value1")).toBeInTheDocument();
    expect(screen.getByText("value2")).toBeInTheDocument();
  });

  it("renders the component correctly with an array as label", () => {
    const document = { label: ["Label1", "Label2"], prop1: "value1" };
    render(<DocumentCard document={document} />);

    // Check if the label is joined correctly in the legend
    expect(screen.getByText("Label1+Label2")).toBeInTheDocument();
  });

  it("should not render table rows with keys that start with an underscore", () => {
    const document = { label: "Document Label", _hiddenProp: "shouldNotShow" };
    render(<DocumentCard document={document} />);

    // Ensure that properties starting with an underscore are not rendered
    expect(screen.queryByText("_hiddenProp")).toBeNull();
  });

  it("renders array values correctly", () => {
    const document = { label: "Document Label", prop1: ["value1", "value2"] };
    render(<DocumentCard document={document} />);

    // Check if array values are joined correctly in the table
    expect(screen.getByText("value1, value2")).toBeInTheDocument();
  });

  it("renders when document is empty", () => {
    const document = {};
    render(<DocumentCard document={document} />);

    // Ensure nothing breaks when the document is empty
    expect(screen.queryByText("legend")).toBeNull();
  });
});
