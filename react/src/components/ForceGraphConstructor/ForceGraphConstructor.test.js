import { processGraphData, processGraphLinks } from "./ForceGraphConstructor";

describe("ForceGraphConstructor data tests", () => {
  describe("processGraphData", () => {
    // Define simple helper functions
    const nodeId = (d) => d._id;
    const labelFn = (d) => `label-${d._id}`;
    const nodeHover = (d) => `hover-${d._id}`;
    const dummyColor = (d) => `color-${d}`;

    // Existing nodes array
    const existingNodes = [{ _id: "A", someProp: 1 }];
    // New nodes with one duplicate ("A") and two new nodes.
    const newNodes = [
      { _id: "A", someProp: 2 }, // duplicate
      { _id: "B", someProp: 3 },
      { _id: "C", someProp: 4 },
    ];

    it("should filter out duplicates and augment new nodes", () => {
      const result = processGraphData(
        existingNodes,
        newNodes,
        nodeId,
        labelFn,
        dummyColor,
        nodeHover,
      );
      // We expect 3 nodes: the original "A" plus new "B" and "C"
      expect(result).toHaveLength(3);

      // Check that node "B" has been augmented properly:
      const nodeB = result.find((n) => n._id === "B");
      expect(nodeB.id).toBe("B");
      expect(nodeB.nodeLabel).toBe("label-B");
      expect(nodeB.nodeHover).toBe("hover-B");
      expect(nodeB.color).toBe("color-B");
    });
  });

  describe("processGraphLinks", () => {
    // Define a label function for links
    const labelFn = (d) => `link-${d._from}-${d._to}`;
    // Use the default linkSource and linkTarget from the function

    // Existing links: one link from A to B
    const existingLinks = [
      {
        _from: "A",
        _to: "B",
        name: "link1",
        // Pretend these were already processed:
        source: { id: "A" },
        target: { id: "B" },
      },
    ];
    // New links: include a duplicate (A->B) and two new links.
    const newLinks = [
      { _from: "A", _to: "B", name: "link1" }, // duplicate
      { _from: "B", _to: "C", name: "link2" },
      { _from: "C", _to: "A", name: "link3" },
    ];
    // Nodes available for mapping
    const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }];

    it("should filter out duplicate links and map source/target nodes", () => {
      const result = processGraphLinks(
        existingLinks,
        newLinks,
        nodes,
        undefined,
        undefined,
        labelFn,
      );
      // Expect one existing plus two new = 3 links
      expect(result).toHaveLength(3);

      // Check that for link "link2", the source and target are correctly set:
      const link2 = result.find((link) => link.name === "link2");
      expect(link2.source.id).toBe("B");
      expect(link2.target.id).toBe("C");
      expect(link2.label).toBe("link-B-C");
    });
  });
});
