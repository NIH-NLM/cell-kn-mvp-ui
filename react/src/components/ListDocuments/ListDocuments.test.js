import { render, screen } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import ListDocuments from "./ListDocuments"; // Adjust the import path if necessary

describe("ListDocuments Component", () => {
  it("renders a single label correctly", () => {
    const document = { _id: "123", label: "Sample Label" };

    render(
      <Router>
        <ListDocuments document={document} />
      </Router>,
    );

    // Check if the label is rendered correctly
    expect(screen.getByText("Sample Label")).toBeInTheDocument();

    // Check if the link has the correct href based on _id
    const linkElement = screen.getByRole("link");
    expect(linkElement).toHaveAttribute("href", "/browse/123");
  });

  it("renders an array label correctly", () => {
    const document = { _id: "123", label: ["Label1", "Label2"] };

    render(
      <Router>
        <ListDocuments document={document} />
      </Router>,
    );

    // Check if the labels are joined by '+'
    expect(screen.getByText("Label1+Label2")).toBeInTheDocument();

    const linkElement = screen.getByRole("link");
    expect(linkElement).toHaveAttribute("href", "/browse/123");
  });

  it("renders term instead of label if label is not present", () => {
    const document = { _id: "123", term: ["Term1", "Term2"] };

    render(
      <Router>
        <ListDocuments document={document} />
      </Router>,
    );

    // Check if the term is displayed correctly
    expect(screen.getByText("Term1+Term2")).toBeInTheDocument();

    const linkElement = screen.getByRole("link");
    expect(linkElement).toHaveAttribute("href", "/browse/123");
  });

  it("renders _id if neither label nor term are present", () => {
    const document = { _id: "123" };

    render(
      <Router>
        <ListDocuments document={document} />
      </Router>,
    );

    // Check if the _id is rendered as the label
    expect(screen.getByText("123")).toBeInTheDocument();

    const linkElement = screen.getByRole("link");
    expect(linkElement).toHaveAttribute("href", "/browse/123");
  });
});
