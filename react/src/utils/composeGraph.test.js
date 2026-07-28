import { composeGraph } from "./composeGraph";

const node = (id) => ({ _id: id, label: id });
const link = (from, to) => ({ _id: `${from}->${to}`, _from: from, _to: to });

describe("composeGraph", () => {
  test("unions two subgraphs and dedupes a shared node and link", () => {
    const subgraphs = {
      A: { nodes: [node("A"), node("S")], links: [link("A", "S")] },
      B: { nodes: [node("B"), node("S")], links: [link("B", "S"), link("A", "S")] },
    };
    const { nodes, links } = composeGraph(["A", "B"], subgraphs);
    expect(nodes.map((n) => n._id).sort()).toEqual(["A", "B", "S"]);
    expect(links.map((l) => l._id).sort()).toEqual(["A->S", "B->S"]);
  });

  test("dropping an origin keeps shared nodes and drops only its unshared nodes", () => {
    const subgraphs = {
      A: { nodes: [node("A"), node("S")], links: [link("A", "S")] },
      B: { nodes: [node("B"), node("S")], links: [link("B", "S")] },
    };
    // Origin B removed: only A's subgraph remains.
    const { nodes } = composeGraph(["A"], subgraphs);
    expect(nodes.map((n) => n._id).sort()).toEqual(["A", "S"]);
  });

  test("empty origin set yields an empty graph", () => {
    const subgraphs = { A: { nodes: [node("A")], links: [] } };
    expect(composeGraph([], subgraphs)).toEqual({ nodes: [], links: [] });
  });

  test("ignores missing subgraphs and falls back to id when _id is absent", () => {
    const subgraphs = { A: { nodes: [{ id: "A" }], links: [] } };
    const { nodes } = composeGraph(["A", "MISSING"], subgraphs);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("A");
  });
});
