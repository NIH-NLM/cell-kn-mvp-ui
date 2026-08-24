/**
 * Pure data processing functions for force graph.
 * These functions transform graph data without side effects.
 */

import { getColorForCollection, getLinkSourceText } from "../../utils";

/**
 * Merges new nodes into existing node list.
 * Filters duplicates and formats new nodes for D3 simulation.
 * @param {Array} existingNodes - Current nodes in graph
 * @param {Array} newNodes - New nodes to add
 * @param {Function} nodeId - Function to extract node ID
 * @param {Function} labelFn - Function to extract node label
 * @param {Function} nodeHover - Function to generate hover text
 * @returns {Array} Combined node list
 */
export function processGraphData(
  existingNodes,
  newNodes,
  nodeId = (d) => d._id,
  labelFn = (d) => d.label,
  nodeHover = undefined,
) {
  // Filter out any new nodes that already exist in the graph.
  const filteredNewNodes = newNodes.filter(
    (newNode) => !existingNodes.some((existing) => existing._id === nodeId(newNode)),
  );

  // Map new nodes to required structure for rendering.
  const processedNewNodes = filteredNewNodes.map((newNode) => {
    const collection = nodeId(newNode).split("/")[0];

    return {
      ...newNode,
      id: nodeId(newNode),
      // Prefer provided nodeHover generator; fallback to labelFn for reasonable default
      nodeHover: typeof nodeHover === "function" ? nodeHover(newNode) : labelFn(newNode),
      color: getColorForCollection(collection),
      nodeLabel: labelFn(newNode),
    };
  });

  return existingNodes.concat(processedNewNodes);
}

/**
 * Integrates new links into existing link list.
 * Resolves source/target objects and flags parallel links for curved rendering.
 * @param {Array} existingLinks - Current links in graph
 * @param {Array} newLinks - New links to add
 * @param {Array} nodes - All nodes (for reference resolution)
 * @param {Function} linkSource - Function to extract source ID from link
 * @param {Function} linkTarget - Function to extract target ID from link
 * @param {Function} labelFn - Function to extract link label
 * @returns {Array} Combined link list
 */
export function processGraphLinks(
  existingLinks,
  newLinks,
  nodes,
  linkSource = ({ _from }) => _from,
  linkTarget = ({ _to }) => _to,
  labelFn = (d) => d.label,
) {
  const updatedExistingLinks = [...existingLinks]; // Work on a mutable copy

  for (const newLink of newLinks) {
    const sourceNodeId = linkSource(newLink);
    const targetNodeId = linkTarget(newLink);

    // Find full node objects for source and target.
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    const targetNode = nodes.find((node) => node.id === targetNodeId);

    // Skip link if either node is not found.
    if (!sourceNode || !targetNode) {
      continue;
    }

    // Skip if link with same _id already exists.
    if (updatedExistingLinks.some((existing) => existing._id === newLink._id)) {
      continue;
    }

    // Prepare new link object with resolved nodes.
    const processedNewLink = {
      ...newLink,
      sourceText: newLink.sourceText ?? getLinkSourceText(newLink),
      source: sourceNode,
      target: targetNode,
      label: labelFn(newLink),
      curveOffset: 0,
    };

    updatedExistingLinks.push(processedNewLink);
  }

  return assignParallelLinkLanes(updatedExistingLinks);
}

/**
 * Spreads links that share a node pair into evenly spaced lanes so they stop
 * drawing on top of each other. Each gets a signed `curveOffset` in lane units:
 * a lone link 0 (straight), a pair -0.5/+0.5, a triple -1/0/+1. The sign is
 * taken against the pair's canonical (id-sorted) direction, which is what puts
 * a bidirectional pair on opposite sides of the chord — the renderer builds
 * each link's perpendicular from its own source->target vector, so a reverse
 * link's perpendicular already points the other way. Recomputed over the whole
 * list on every update, so dropping one side re-straightens the survivor.
 * @param {Array} links - Links with resolved source/target node objects
 * @returns {Array} The same array, with curveOffset set on every link
 */
export function assignParallelLinkLanes(links) {
  const groups = new Map();

  for (const link of links) {
    link.curveOffset = 0;
    const sourceId = link.source?.id ?? link.source;
    const targetId = link.target?.id ?? link.target;
    // Self-links render as a loop, so they need no lane.
    if (sourceId === targetId) continue;
    const pairKey =
      sourceId < targetId ? `${sourceId}\u0000${targetId}` : `${targetId}\u0000${sourceId}`;
    const group = groups.get(pairKey);
    if (group) {
      group.push(link);
    } else {
      groups.set(pairKey, [link]);
    }
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Order by _id so adding an unrelated link elsewhere cannot reshuffle the
    // lanes of a group that has not itself changed.
    group.sort((a, b) => String(a._id).localeCompare(String(b._id)));
    for (const [index, link] of group.entries()) {
      const lane = index - (group.length - 1) / 2;
      const sourceId = link.source?.id ?? link.source;
      const targetId = link.target?.id ?? link.target;
      link.curveOffset = sourceId < targetId ? lane : -lane;
    }
  }

  return links;
}

/**
 * Filters out a single link by _id, leaving the rest of the list untouched.
 * Returns the same array reference when no removal is requested so callers
 * can cheaply detect a no-op.
 * @param {Array} links - Current links in graph
 * @param {string|null|undefined} removeLinkId - _id of the link to remove
 * @returns {Array} Links with the matching _id removed
 */
export function filterRemovedLink(links, removeLinkId) {
  if (!removeLinkId) return links;
  return links.filter((l) => l._id !== removeLinkId);
}

/**
 * Identifies leaf nodes connected only to a single neighbor from collapse list.
 * @param {Array} nodes - All nodes in the graph
 * @param {Array} links - All links in the graph
 * @param {Array} collapseNodes - Nodes to check for leaf neighbors
 * @param {Array} originNodeIds - Origin nodes that cannot be leaves
 * @returns {Array} IDs of leaf nodes to remove
 */
export function findLeafNodes(nodes, links, collapseNodes, originNodeIds = [], mode = "standard") {
  const leafNodes = [];
  for (const node of nodes) {
    // Origin nodes cannot be leaves.
    if (originNodeIds.includes(node.id)) continue;
    // Filter for links connected to current node.
    const nodeLinks = links.filter(
      (l) => (l.source.id || l.source) === node.id || (l.target.id || l.target) === node.id,
    );
    if (nodeLinks.length > 0) {
      // Check if all links connect to the same neighbor.
      const firstNeighborId =
        (nodeLinks[0].source.id || nodeLinks[0].source) === node.id
          ? nodeLinks[0].target.id || nodeLinks[0].target
          : nodeLinks[0].source.id || nodeLinks[0].source;
      const allLinksToSameNeighbor = nodeLinks.every(
        (l) =>
          ((l.source.id || l.source) === node.id &&
            (l.target.id || l.target) === firstNeighborId) ||
          ((l.target.id || l.target) === node.id && (l.source.id || l.source) === firstNeighborId),
      );
      // "standard": neighbor must be in collapse list (skips origin-adjacent leaves).
      // "all": any single-neighbor node is a leaf (includes origin-adjacent).
      if (allLinksToSameNeighbor) {
        if (mode === "all" || collapseNodes.includes(firstNeighborId)) {
          leafNodes.push(node.id);
        }
      }
    }
  }
  return leafNodes;
}
