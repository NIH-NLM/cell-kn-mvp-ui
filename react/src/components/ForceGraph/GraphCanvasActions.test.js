import { act, fireEvent, render, screen } from "@testing-library/react";
import GraphCanvasActions from "./GraphCanvasActions";

const target = { current: document.createElement("div") };

const baseProps = {
  originsOpen: false,
  originCount: 0,
  lassoMode: false,
  onToggleLasso: () => {},
  onDownload: () => {},
  fullscreenTargetRef: target,
};

// jsdom implements neither the Fullscreen API nor its document properties.
const stubFullscreen = ({ element = null } = {}) => {
  const requestFullscreen = jest.fn();
  const exitFullscreen = jest.fn();
  Object.defineProperties(document, {
    fullscreenEnabled: { value: true, configurable: true },
    fullscreenElement: { value: element, configurable: true },
    exitFullscreen: { value: exitFullscreen, configurable: true },
  });
  target.current.requestFullscreen = requestFullscreen;
  return { requestFullscreen, exitFullscreen };
};

beforeEach(() => stubFullscreen());

describe("GraphCanvasActions", () => {
  // The e2e suite and useGraphExport select on these class names, so they are
  // part of the contract, not incidental styling.
  it("keeps the class names the graph tooling selects on", () => {
    const { container } = render(<GraphCanvasActions {...baseProps} onToggleOrigins={() => {}} />);
    expect(container.querySelector(".graph-canvas-actions")).toBeInTheDocument();
    for (const cls of [
      "graph-canvas-origins",
      "graph-canvas-fullscreen",
      "graph-canvas-lasso",
      "graph-canvas-download",
    ]) {
      expect(container.querySelector(`.graph-canvas-icon-button.${cls}`)).toBeInTheDocument();
    }
  });

  it("omits the origins button when no toggle is supplied", () => {
    const { container } = render(<GraphCanvasActions {...baseProps} />);
    expect(container.querySelector(".graph-canvas-origins")).toBeNull();
    expect(container.querySelectorAll(".graph-canvas-icon-button")).toHaveLength(3);
  });

  it("shows the origin count badge only when there are origins", () => {
    const { container, rerender } = render(
      <GraphCanvasActions {...baseProps} onToggleOrigins={() => {}} originCount={0} />,
    );
    expect(container.querySelector(".graph-canvas-origins-count")).toBeNull();

    rerender(<GraphCanvasActions {...baseProps} onToggleOrigins={() => {}} originCount={3} />);
    expect(container.querySelector(".graph-canvas-origins-count")).toHaveTextContent("3");
    expect(screen.getByLabelText("Origins (3)")).toBeInTheDocument();
  });

  it("reflects lasso state through aria-pressed and the active class", () => {
    const { container, rerender } = render(<GraphCanvasActions {...baseProps} lassoMode={false} />);
    const lasso = container.querySelector(".graph-canvas-lasso");
    expect(lasso).toHaveAttribute("aria-pressed", "false");
    expect(lasso).not.toHaveClass("active");

    rerender(<GraphCanvasActions {...baseProps} lassoMode={true} />);
    expect(container.querySelector(".graph-canvas-lasso")).toHaveClass("active");
  });

  it("forwards lasso and download clicks", () => {
    const onToggleLasso = jest.fn();
    const onDownload = jest.fn();
    const { container } = render(
      <GraphCanvasActions {...baseProps} onToggleLasso={onToggleLasso} onDownload={onDownload} />,
    );
    fireEvent.click(container.querySelector(".graph-canvas-lasso"));
    fireEvent.click(container.querySelector(".graph-canvas-download"));
    expect(onToggleLasso).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("asks the target element for full screen, and the document to leave it", () => {
    const { requestFullscreen } = stubFullscreen();
    const { container } = render(<GraphCanvasActions {...baseProps} />);
    fireEvent.click(container.querySelector(".graph-canvas-fullscreen"));
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    const { exitFullscreen } = stubFullscreen({ element: target.current });
    act(() => document.dispatchEvent(new Event("fullscreenchange")));
    expect(screen.getByLabelText("Exit full screen")).toHaveClass("active");

    fireEvent.click(container.querySelector(".graph-canvas-fullscreen"));
    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("omits the full-screen button where the browser has no Fullscreen API", () => {
    Object.defineProperty(document, "fullscreenEnabled", { value: false, configurable: true });
    const { container } = render(<GraphCanvasActions {...baseProps} />);
    expect(container.querySelector(".graph-canvas-fullscreen")).toBeNull();
  });
});
