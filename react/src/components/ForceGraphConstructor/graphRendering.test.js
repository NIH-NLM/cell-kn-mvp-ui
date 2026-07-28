import * as d3 from "d3";
import { toggleFocusNodeRendering } from "./graphRendering";

// Builds a minimal node container with one <g.node> per id, each bound to a
// datum { id }, mirroring what renderGraph produces. Returns the container
// selection so tests can invoke toggleFocusNodeRendering against it.
function buildContainer(ids) {
  document.body.innerHTML = "<svg><g class='node-container'></g></svg>";
  const container = d3.select("g.node-container");
  container
    .selectAll("g.node")
    .data(ids.map((id) => ({ id })))
    .enter()
    .append("g")
    .attr("class", "node")
    .each(function () {
      // A visible base circle + a label, matching the real node structure.
      const g = d3.select(this);
      g.append("circle").attr("class", "base");
      g.append("text").text("label");
    });
  return container;
}

const donutCount = (id) =>
  d3
    .selectAll("g.node")
    .filter((d) => d.id === id)
    .select("circle.donut-inner")
    .size();

describe("toggleFocusNodeRendering", () => {
  it("adds a donut only to origin nodes when focus nodes are on", () => {
    const container = buildContainer(["A", "B"]);
    toggleFocusNodeRendering(d3, container, true, ["A"], 10);
    expect(donutCount("A")).toBe(1);
    expect(donutCount("B")).toBe(0);
  });

  it("moves the donut when the origin set changes (promote B, demote A)", () => {
    const container = buildContainer(["A", "B"]);
    toggleFocusNodeRendering(d3, container, true, ["A"], 10);
    expect(donutCount("A")).toBe(1);
    // Recompose: A is no longer an origin, B becomes one.
    toggleFocusNodeRendering(d3, container, true, ["B"], 10);
    expect(donutCount("A")).toBe(0);
    expect(donutCount("B")).toBe(1);
  });

  it("does not add a second donut when re-applied with the same origin", () => {
    const container = buildContainer(["A"]);
    toggleFocusNodeRendering(d3, container, true, ["A"], 10);
    toggleFocusNodeRendering(d3, container, true, ["A"], 10);
    expect(donutCount("A")).toBe(1);
  });

  it("removes all donuts when focus nodes are turned off", () => {
    const container = buildContainer(["A", "B"]);
    toggleFocusNodeRendering(d3, container, true, ["A", "B"], 10);
    expect(donutCount("A")).toBe(1);
    toggleFocusNodeRendering(d3, container, false, ["A", "B"], 10);
    expect(donutCount("A")).toBe(0);
    expect(donutCount("B")).toBe(0);
  });
});
