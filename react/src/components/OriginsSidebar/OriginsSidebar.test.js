import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import OriginsSidebar from "./OriginsSidebar";

// Stub the thunk so we only assert it is dispatched (its async guts are tested
// in graphSlice.origin-composition.test.js).
jest.mock("store", () => ({
  removeOriginNode: (id) => ({ type: "graph/removeOriginNode/stub", payload: id }),
  removeNodeFromSlice: (id) => ({ type: "nodesSlice/removeNodeFromSlice", payload: id }),
}));

jest.mock("utils", () => ({
  ...jest.requireActual("utils"),
  getLabel: (node) => node.label ?? node._id,
}));

function renderSidebar(originNodeIds, nodes, props = {}) {
  const dispatched = [];
  const store = configureStore({
    reducer: {
      graph: (state = { present: { originNodeIds, graphData: { nodes } } }) => state,
    },
    middleware: (getDefault) =>
      getDefault().concat(() => (next) => (action) => {
        dispatched.push(action);
        return next(action);
      }),
  });
  render(
    <Provider store={store}>
      <OriginsSidebar isOpen onClose={() => {}} {...props} />
    </Provider>,
  );
  return dispatched;
}

test("renders nothing when closed", () => {
  const store = configureStore({
    reducer: { graph: (s = { present: { originNodeIds: [], graphData: { nodes: [] } } }) => s },
  });
  const { container } = render(
    <Provider store={store}>
      <OriginsSidebar isOpen={false} onClose={() => {}} />
    </Provider>,
  );
  expect(container).toBeEmptyDOMElement();
});

test("lists current origins by label", () => {
  renderSidebar(
    ["cs/1", "cs/2"],
    [
      { _id: "cs/1", label: "T cell" },
      { _id: "cs/2", label: "B cell" },
    ],
  );
  expect(screen.getByText("T cell")).toBeInTheDocument();
  expect(screen.getByText("B cell")).toBeInTheDocument();
});

test("remove control dispatches removeOriginNode and the cart removal", () => {
  const dispatched = renderSidebar(["cs/1"], [{ _id: "cs/1", label: "T cell" }]);
  fireEvent.click(screen.getByRole("button", { name: /remove t cell as origin/i }));
  const types = dispatched.map((a) => a.type);
  expect(types).toContain("graph/removeOriginNode/stub");
  expect(types).toContain("nodesSlice/removeNodeFromSlice");
});

test("shows an empty state when there are no origins", () => {
  renderSidebar([], []);
  expect(screen.getByText(/no origins/i)).toBeInTheDocument();
});
