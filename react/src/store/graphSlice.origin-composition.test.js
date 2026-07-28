import { configureStore } from "@reduxjs/toolkit";
import graphReducer, {
  addOriginNode,
  fetchAndProcessGraph,
  initializeGraph,
  pruneOrigins,
  removeOriginNode,
  setGraphData,
} from "./graphSlice";

// Mock the services the thunks call.
jest.mock("../services", () => ({
  fetchNodeExpansion: jest.fn(),
  fetchEdgesBetween: jest.fn(),
  fetchGraphData: jest.fn(),
  fetchEdgeFilterOptions: jest.fn(),
}));

import { fetchEdgesBetween, fetchGraphData, fetchNodeExpansion } from "../services";

const node = (id) => ({ _id: id, label: id });
const link = (from, to) => ({ _id: `${from}->${to}`, _from: from, _to: to, _key: `${from}-${to}` });

function makeStore(preloadedPresent) {
  // graphReducer is undoable; seed the present slice via a store and dispatches.
  const store = configureStore({
    reducer: { graph: graphReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });
  if (preloadedPresent) {
    // Seed origin A already present (as if it were the first origin).
    store.dispatch({ type: "graph/__seed", ...preloadedPresent });
  }
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("addOriginNode stores the origin's subgraph, adds the id, and composes graphData", async () => {
  fetchNodeExpansion.mockResolvedValue({
    A: { nodes: [node("A"), node("N1")], links: [link("A", "N1")] },
  });
  fetchEdgesBetween.mockResolvedValue([]);

  const store = makeStore();
  await store.dispatch(addOriginNode("A"));

  const present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual(["A"]);
  expect(present.originSubgraphs.A.nodes.map((n) => n._id).sort()).toEqual(["A", "N1"]);
  expect(present.graphData.nodes.map((n) => n._id).sort()).toEqual(["A", "N1"]);
  expect(present.lastActionType).toBe("recompose/add");
});

test("addOriginNode merges cross-origin edges from fetchEdgesBetween, deduped", async () => {
  fetchNodeExpansion.mockResolvedValue({
    B: { nodes: [node("B")], links: [] },
  });
  // Cross-origin edge B->A returned by the scan; A->N1 duplicate must not double.
  fetchEdgesBetween.mockResolvedValue([link("B", "A"), link("A", "N1")]);

  const store = makeStore();
  // First origin A.
  fetchNodeExpansion.mockResolvedValueOnce({
    A: { nodes: [node("A"), node("N1")], links: [link("A", "N1")] },
  });
  await store.dispatch(addOriginNode("A"));
  // Second origin B.
  fetchNodeExpansion.mockResolvedValueOnce({ B: { nodes: [node("B")], links: [] } });
  fetchEdgesBetween.mockResolvedValueOnce([link("B", "A"), link("A", "N1")]);
  await store.dispatch(addOriginNode("B"));

  const present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual(["A", "B"]);
  const linkIds = present.graphData.links.map((l) => l._id).sort();
  expect(linkIds).toEqual(["A->N1", "B->A"]);
});

test("removeOriginNode drops the origin's unshared nodes and clears when last origin removed", async () => {
  fetchNodeExpansion
    .mockResolvedValueOnce({ A: { nodes: [node("A"), node("S")], links: [link("A", "S")] } })
    .mockResolvedValueOnce({ B: { nodes: [node("B"), node("S")], links: [link("B", "S")] } });
  fetchEdgesBetween.mockResolvedValue([]);

  const store = makeStore();
  await store.dispatch(addOriginNode("A"));
  await store.dispatch(addOriginNode("B"));

  // Remove B: A + shared S remain, B drops.
  await store.dispatch(removeOriginNode("B"));
  let present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual(["A"]);
  expect(present.graphData.nodes.map((n) => n._id).sort()).toEqual(["A", "S"]);
  expect(present.lastActionType).toBe("recompose/remove");

  // Remove A (last origin): empty graph.
  await store.dispatch(removeOriginNode("A"));
  present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual([]);
  expect(present.graphData).toEqual({ nodes: [], links: [] });
  expect(present.originSubgraphs).toEqual({});
});

test("bulk fetch captures each origin's subgraph so removeOriginNode works on a normally-built graph", async () => {
  const A = "cs/A";
  const B = "cs/B";
  fetchGraphData.mockResolvedValue({
    [A]: {
      nodes: [node(A), node("cs/SHARED"), node("cs/A_ONLY")],
      links: [link(A, "cs/SHARED"), link(A, "cs/A_ONLY")],
    },
    [B]: {
      nodes: [node(B), node("cs/SHARED"), node("cs/B_ONLY")],
      links: [link(B, "cs/SHARED"), link(B, "cs/B_ONLY")],
    },
  });
  fetchEdgesBetween.mockResolvedValue([]);

  const store = makeStore();
  store.dispatch(initializeGraph({ nodeIds: [A, B], isAdvancedMode: false, perNodeSettings: {} }));
  await store.dispatch(fetchAndProcessGraph());

  let present = store.getState().graph.present;
  expect(Object.keys(present.originSubgraphs).sort()).toEqual([A, B].sort());

  // Remove B on a bulk-built graph: A + shared survive, B_ONLY drops, graph NOT emptied.
  await store.dispatch(removeOriginNode(B));
  present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual([A]);
  expect(present.graphData.nodes.map((n) => n._id).sort()).toEqual([
    "cs/A",
    "cs/A_ONLY",
    "cs/SHARED",
  ]);
});

test("restore (setGraphData with graphData, no originNodeIds) clears stale originSubgraphs", async () => {
  fetchNodeExpansion.mockResolvedValueOnce({ "cs/A": { nodes: [node("cs/A")], links: [] } });
  fetchEdgesBetween.mockResolvedValue([]);
  const store = makeStore();
  await store.dispatch(addOriginNode("cs/A"));
  expect(store.getState().graph.present.originSubgraphs["cs/A"]).toBeTruthy();
  // Simulate a history restore replacing the graph.
  store.dispatch(
    setGraphData({
      graphData: { nodes: [node("cs/Z")], links: [] },
      isRestore: true,
      skipUndo: true,
    }),
  );
  expect(store.getState().graph.present.originSubgraphs).toEqual({});
});

test("history restore clears stale live origins so the sidebar shows none", async () => {
  fetchNodeExpansion.mockResolvedValueOnce({ "cs/A": { nodes: [node("cs/A")], links: [] } });
  fetchEdgesBetween.mockResolvedValue([]);
  const store = makeStore();
  await store.dispatch(addOriginNode("cs/A"));
  expect(store.getState().graph.present.originNodeIds).toEqual(["cs/A"]);
  store.dispatch(
    setGraphData({
      graphData: { nodes: [node("cs/Z")], links: [] },
      isRestore: true,
      skipUndo: true,
    }),
  );
  expect(store.getState().graph.present.originNodeIds).toEqual([]);
});

test("removeOriginNode self-heals missing subgraphs instead of emptying the graph", async () => {
  const A = "cs/A";
  const B = "cs/B";
  // Simulate a post-restore state: originNodeIds set, but originSubgraphs empty.
  const store = makeStore();
  store.dispatch(initializeGraph({ nodeIds: [A, B], isAdvancedMode: false, perNodeSettings: {} }));
  // originSubgraphs is {} here (initializeGraph resets it). Remove B; A must be re-fetched.
  fetchNodeExpansion.mockResolvedValueOnce({
    [A]: { nodes: [node(A), node("cs/SHARED")], links: [link(A, "cs/SHARED")] },
  });
  fetchEdgesBetween.mockResolvedValue([]);
  await store.dispatch(removeOriginNode(B));
  const present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual([A]);
  // A's neighborhood was re-fetched → graph is NOT empty.
  expect(present.graphData.nodes.map((n) => n._id).sort()).toEqual(["cs/A", "cs/SHARED"]);
  expect(present.originSubgraphs[A]).toBeTruthy();
});

test("pruneOrigins removes ids from originNodeIds and originSubgraphs", async () => {
  fetchNodeExpansion.mockResolvedValueOnce({
    "cs/A": { nodes: [node("cs/A"), node("cs/N")], links: [link("cs/A", "cs/N")] },
  });
  fetchEdgesBetween.mockResolvedValue([]);
  const store = makeStore();
  await store.dispatch(addOriginNode("cs/A"));
  expect(store.getState().graph.present.originNodeIds).toEqual(["cs/A"]);
  store.dispatch(pruneOrigins(["cs/A"]));
  const present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual([]);
  expect(present.originSubgraphs["cs/A"]).toBeUndefined();
});

test("after pruneOrigins, a later removeOriginNode does not resurrect the deleted origin", async () => {
  const A = "cs/A";
  const B = "cs/B";
  fetchNodeExpansion
    .mockResolvedValueOnce({
      [A]: { nodes: [node(A), node("cs/SHARED")], links: [link(A, "cs/SHARED")] },
    })
    .mockResolvedValueOnce({
      [B]: { nodes: [node(B), node("cs/SHARED")], links: [link(B, "cs/SHARED")] },
    });
  fetchEdgesBetween.mockResolvedValue([]);
  const store = makeStore();
  await store.dispatch(addOriginNode(A));
  await store.dispatch(addOriginNode(B));
  // Simulate "Remove Node" deleting origin A from the view + pruning its bookkeeping.
  store.dispatch(pruneOrigins([A]));
  // Now remove B as origin: A must NOT reappear (it was pruned).
  await store.dispatch(removeOriginNode(B));
  const present = store.getState().graph.present;
  expect(present.originNodeIds).toEqual([]);
  expect(present.graphData.nodes.map((n) => n._id)).not.toContain(A);
});
