import { computeDroppedNodeIds } from "./ForceGraph";

describe("computeDroppedNodeIds", () => {
  test("returns ids present before but absent after recompose", () => {
    const before = { nodes: [{ _id: "A" }, { _id: "B" }, { _id: "S" }] };
    const after = { nodes: [{ _id: "A" }, { _id: "S" }] };
    expect(computeDroppedNodeIds(before, after).sort()).toEqual(["B"]);
  });

  test("returns empty when nothing dropped", () => {
    const before = { nodes: [{ _id: "A" }] };
    const after = { nodes: [{ _id: "A" }, { _id: "N" }] };
    expect(computeDroppedNodeIds(before, after)).toEqual([]);
  });

  test("tolerates a null before-graph", () => {
    expect(computeDroppedNodeIds(null, { nodes: [{ _id: "A" }] })).toEqual([]);
  });
});
