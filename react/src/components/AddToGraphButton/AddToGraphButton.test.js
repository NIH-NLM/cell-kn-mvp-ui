import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import nodesReducer from "../../store/nodesSlice";
import { ToastProvider } from "../Toast";
import AddToGraphButton from "./AddToGraphButton";

const NODE_ID = "CL/001";

const createTestStore = (nodeIds = []) =>
  configureStore({
    reducer: { nodesSlice: nodesReducer },
    preloadedState: { nodesSlice: { originNodeIds: nodeIds } },
  });

const renderButton = (store) =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ToastProvider>
          <AddToGraphButton nodeId={NODE_ID} />
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  );

describe("AddToGraphButton", () => {
  afterEach(() => {
    const root = document.getElementById("toast-root");
    root?.parentNode?.removeChild(root);
  });

  it("titles the button 'Add as origin' when the node is not staged", () => {
    const store = createTestStore([]);
    renderButton(store);

    expect(screen.getByRole("button")).toHaveAttribute("title", "Add as origin");
  });

  it("titles the button 'Remove as origin' when the node is already staged", () => {
    const store = createTestStore([NODE_ID]);
    renderButton(store);

    expect(screen.getByRole("button")).toHaveAttribute("title", "Remove as origin");
  });

  it("shows a toast with a /graph link when adding a node", () => {
    const store = createTestStore([]);
    renderButton(store);

    fireEvent.click(screen.getByRole("button", { name: /add as origin/i }));

    expect(screen.getByText("Added as origin.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view graph/i })).toHaveAttribute("href", "/graph");
  });

  it("does NOT show a toast when removing a node", () => {
    const store = createTestStore([NODE_ID]);
    renderButton(store);

    fireEvent.click(screen.getByRole("button", { name: /remove as origin/i }));

    expect(screen.queryByText("Added as origin.")).not.toBeInTheDocument();
  });
});
