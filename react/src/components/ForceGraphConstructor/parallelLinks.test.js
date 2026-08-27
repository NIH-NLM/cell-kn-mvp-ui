import ForceGraphConstructor from "./ForceGraphConstructor";

// End-to-end check of the reported bug (nlm-ckn#312): two edges between the
// same pair of nodes drew as one line under one stack of labels. Driven through
// the real constructor, so lane offset, curve, and label placement are all
// exercised as the app runs them.
const node = (id, x, y) => ({ _id: id, label: id, x, y });
const edge = (id, from, to, label) => ({ _id: id, _key: id, _from: from, _to: to, label });

async function render(links) {
  document.body.innerHTML = "<svg></svg>";
  const svg = document.querySelector("svg");
  // jsdom implements no SVGAnimatedRect, which d3-zoom reads for its extent.
  Object.defineProperty(svg, "viewBox", {
    value: { baseVal: { x: 0, y: 0, width: 640, height: 640 } },
  });
  const graph = ForceGraphConstructor(svg, { nodes: [], links: [] }, { collectionMaps: new Map() });
  graph.restoreGraph({
    nodes: [node("A", -100, 0), node("B", 100, 0)],
    links,
    labelStates: {},
  });
  // The tick handler that positions links runs on animation frames.
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    paths: [...svg.querySelectorAll("g.link path.link-visible")].map((p) => p.getAttribute("d")),
    labels: [...svg.querySelectorAll("g.link text.link-label")].map((t) =>
      t.getAttribute("transform"),
    ),
  };
}

describe("links sharing a node pair", () => {
  it("draws a bidirectional pair as two distinct curves with separated labels", async () => {
    const { paths, labels } = await render([
      edge("A-rel-B", "A", "B", "PART_OF"),
      edge("B-rel-A", "B", "A", "CONTRIBUTES_TO_MORPHOLOGY_OF"),
    ]);

    for (const d of paths) expect(d).toContain("Q");
    expect(paths[0]).not.toBe(paths[1]);
    // The overlap the issue reported: both labels landing on the same point.
    expect(labels[0]).not.toBe(labels[1]);
  });

  it("separates two edges that run in the same direction", async () => {
    const { paths, labels } = await render([
      edge("A-part-B", "A", "B", "PART_OF"),
      edge("A-morph-B", "A", "B", "CONTRIBUTES_TO_MORPHOLOGY_OF"),
    ]);

    expect(paths[0]).not.toBe(paths[1]);
    expect(labels[0]).not.toBe(labels[1]);
  });

  it("leaves a lone edge as a straight line", async () => {
    const { paths } = await render([edge("A-part-B", "A", "B", "PART_OF")]);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain("L");
    expect(paths[0]).not.toContain("Q");
  });
});
