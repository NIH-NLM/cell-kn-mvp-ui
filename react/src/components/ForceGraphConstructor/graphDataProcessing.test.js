import { assignParallelLinkLanes, findLeafNodes } from "./graphDataProcessing";

// Characterization tests pinning the current behavior of findLeafNodes so the
// workflow-init collapse path has a regression net to lean on.
describe("findLeafNodes", () => {
  it("returns [] when mode='standard' and collapseNodes is empty", () => {
    const nodes = [{ id: "A" }, { id: "B" }];
    const links = [{ source: "A", target: "B" }];
    expect(findLeafNodes(nodes, links, [], [], "standard")).toEqual([]);
  });

  it("collapses a leaf in 'standard' mode when the single neighbor IS in collapseNodes", () => {
    const nodes = [{ id: "A" }, { id: "B" }];
    const links = [{ source: "A", target: "B" }];
    // B has one neighbor (A), and A is in collapseNodes → B is a leaf.
    expect(findLeafNodes(nodes, links, ["A"], [], "standard")).toEqual(["B"]);
  });

  it("does NOT collapse a leaf in 'standard' mode whose single neighbor is an origin (origin not in collapseNodes)", () => {
    const nodes = [{ id: "ORIGIN" }, { id: "LEAF" }];
    const links = [{ source: "ORIGIN", target: "LEAF" }];
    // Origin is excluded from collapseNodes per the workflow build pattern;
    // 'standard' mode requires the neighbor to be in collapseNodes.
    const result = findLeafNodes(nodes, links, ["LEAF"], ["ORIGIN"], "standard");
    expect(result).toEqual([]);
  });

  it("collapses every single-neighbor non-origin node in 'all' mode, including one whose only neighbor is an origin", () => {
    const nodes = [
      { id: "ORIGIN" },
      { id: "LEAF_OF_ORIGIN" },
      { id: "INNER" },
      { id: "LEAF_OF_INNER" },
    ];
    const links = [
      { source: "ORIGIN", target: "LEAF_OF_ORIGIN" },
      { source: "ORIGIN", target: "INNER" },
      { source: "INNER", target: "LEAF_OF_INNER" },
    ];
    // 'all' mode ignores collapseNodes membership for the neighbor check.
    const result = findLeafNodes(
      nodes,
      links,
      ["LEAF_OF_ORIGIN", "INNER", "LEAF_OF_INNER"],
      ["ORIGIN"],
      "all",
    );
    expect(result).toEqual(expect.arrayContaining(["LEAF_OF_ORIGIN", "LEAF_OF_INNER"]));
    expect(result).not.toContain("ORIGIN");
    // INNER has two distinct neighbors (ORIGIN, LEAF_OF_INNER) so it is not a leaf.
    expect(result).not.toContain("INNER");
  });

  it("never collapses origin nodes themselves", () => {
    const nodes = [{ id: "ORIGIN" }, { id: "ONLY_NEIGHBOR" }];
    // ORIGIN has a single neighbor — would be a leaf if it weren't an origin.
    const links = [{ source: "ORIGIN", target: "ONLY_NEIGHBOR" }];
    const result = findLeafNodes(nodes, links, ["ONLY_NEIGHBOR"], ["ORIGIN"], "all");
    expect(result).not.toContain("ORIGIN");
  });

  it("does NOT treat a node with two distinct neighbors as a leaf", () => {
    const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }];
    const links = [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
    ];
    // B has two distinct neighbors (A, C) — not a leaf in either mode.
    expect(findLeafNodes(nodes, links, ["A", "C"], [], "standard")).not.toContain("B");
    expect(findLeafNodes(nodes, links, ["A", "C"], [], "all")).not.toContain("B");
  });

  it("treats a node with multiple links to the SAME neighbor as a leaf", () => {
    const nodes = [{ id: "A" }, { id: "B" }];
    // Two parallel links between A and B (e.g., distinct predicates).
    const links = [
      { source: "A", target: "B" },
      { source: "A", target: "B" },
    ];
    expect(findLeafNodes(nodes, links, ["A"], [], "standard")).toEqual(["B"]);
  });
});

// Lane assignment for links that share a node pair. Real edge keys look like
// "<fromKey>-<PREDICATE:CURIE>-<toKey>" and from-keys contain hyphens of their
// own, so grouping has to key on the endpoint ids rather than on the key text.
describe("assignParallelLinkLanes", () => {
  const link = (id, sourceId, targetId) => ({
    _id: id,
    source: { id: sourceId },
    target: { id: targetId },
  });
  const offsets = (links) => assignParallelLinkLanes(links).map((l) => l.curveOffset);

  it("bows a bidirectional pair to opposite sides in absolute space", () => {
    // Matching offsets, opposite perpendiculars — see assignParallelLinkLanes.
    expect(offsets([link("e1", "A", "B"), link("e2", "B", "A")])).toEqual([-0.5, -0.5]);
  });

  it("spreads three links into evenly spaced lanes", () => {
    expect(offsets([link("e1", "A", "B"), link("e2", "A", "B"), link("e3", "A", "B")])).toEqual([
      -1, 0, 1,
    ]);
  });

  it("keys on the node pair, not on the hyphenated edge key", () => {
    // Production keys: "<fromKey>-<predicate>-<toKey>", from-key full of hyphens.
    const forward = link("x-IAO:0000136-y", "CSD/ff2e-0848-4346__kidney", "UBERON/0002113");
    const reverse = link("y-IAO:0000136-x", "UBERON/0002113", "CSD/ff2e-0848-4346__kidney");
    expect(offsets([forward, reverse])).toEqual([-0.5, -0.5]);
  });

  it("leaves self-links straight so they keep their own loop path", () => {
    expect(offsets([link("e1", "A", "A"), link("e2", "A", "A")])).toEqual([0, 0]);
  });

  it("re-straightens a link once its partner is removed", () => {
    // The incremental flag this replaces could never be cleared: dropping one
    // side left the survivor permanently curved.
    const links = [link("e1", "A", "B"), link("e2", "B", "A")];
    assignParallelLinkLanes(links);
    expect(offsets(links.filter((l) => l._id === "e1"))).toEqual([0]);
  });
});
