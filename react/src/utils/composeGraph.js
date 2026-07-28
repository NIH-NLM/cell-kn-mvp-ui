/**
 * Compose the live graph as the union of the current origins' subgraphs.
 *
 * A node/link survives iff at least one *current* origin's subgraph contains
 * it, which is what makes "remove an origin" correct for shared nodes without
 * re-querying. Cross-origin connecting edges are filled in separately (by the
 * thunk, via fetchEdgesBetween) after this pure union.
 *
 * @param {string[]} originNodeIds - Ordered ids of the current origins.
 * @param {{ [id: string]: { nodes: object[], links: object[] } }} originSubgraphs
 *   Each origin's captured neighborhood.
 * @returns {{ nodes: object[], links: object[] }} Deduped union.
 */
export function composeGraph(originNodeIds, originSubgraphs) {
  const nodeById = new Map();
  const linkById = new Map();

  for (const originId of originNodeIds) {
    const subgraph = originSubgraphs?.[originId];
    if (!subgraph) continue;

    for (const node of subgraph.nodes || []) {
      const id = node._id ?? node.id;
      if (id != null && !nodeById.has(id)) {
        nodeById.set(id, node);
      }
    }
    for (const link of subgraph.links || []) {
      const id = link._id ?? `${link._from}-${link._to}`;
      if (id != null && !linkById.has(id)) {
        linkById.set(id, link);
      }
    }
  }

  return { nodes: Array.from(nodeById.values()), links: Array.from(linkById.values()) };
}
