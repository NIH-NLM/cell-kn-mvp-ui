import reducer, {
  addHistoryEntry,
  deleteHistoryEntry,
  restoreHistoryEntry,
  selectOriginHistory,
  setActiveHistory,
  syncActiveHistoryEntry,
  updateHistoryEntry,
} from "./savedGraphsSlice";

const entry = (originId, nodeIds) => ({
  id: `h-${originId}`,
  originId,
  label: originId,
  timestamp: "t",
  thumbnail: null,
  subgraph: {
    nodes: nodeIds.map((n) => ({ _id: n, id: n, x: 1, y: 2 })),
    links: [],
  },
});

describe("originHistory", () => {
  it("addHistoryEntry appends and does not duplicate the same origin", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A", "n1"])));
    s = reducer(s, addHistoryEntry(entry("A", ["A", "n1"])));
    expect(s.originHistory).toHaveLength(1);
    s = reducer(s, addHistoryEntry(entry("B", ["B", "n2"])));
    expect(s.originHistory.map((e) => e.originId)).toEqual(["A", "B"]);
  });

  it("addHistoryEntry does not store a checked field", () => {
    const s = reducer(undefined, addHistoryEntry({ ...entry("A", ["A"]), checked: true }));
    expect(s.originHistory[0].checked).toBeUndefined();
  });

  it("addHistoryEntry marks the new entry active", () => {
    const s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    expect(s.activeHistoryId).toBe("h-A");
  });

  it("addHistoryEntry re-activates an already-tracked origin without duplicating", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    s = reducer(s, addHistoryEntry(entry("B", ["B"])));
    expect(s.activeHistoryId).toBe("h-B");
    s = reducer(s, addHistoryEntry(entry("A", ["A"]))); // dup origin
    expect(s.originHistory).toHaveLength(2);
    expect(s.activeHistoryId).toBe("h-A"); // focus returns to A
  });

  it("deleteHistoryEntry removes it", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    s = reducer(s, deleteHistoryEntry("h-A"));
    expect(s.originHistory).toHaveLength(0);
  });

  it("deleteHistoryEntry clears activeHistoryId when deleting the active entry", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    s = reducer(s, setActiveHistory("h-A"));
    expect(s.activeHistoryId).toBe("h-A");
    s = reducer(s, deleteHistoryEntry("h-A"));
    expect(s.originHistory).toHaveLength(0);
    expect(s.activeHistoryId).toBeNull();
  });

  it("deleteHistoryEntry leaves activeHistoryId unchanged when deleting a different entry", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    s = reducer(s, addHistoryEntry(entry("B", ["B"])));
    s = reducer(s, setActiveHistory("h-A"));
    s = reducer(s, deleteHistoryEntry("h-B"));
    expect(s.activeHistoryId).toBe("h-A");
  });

  it("setActiveHistory sets activeHistoryId", () => {
    const s = reducer(undefined, setActiveHistory("h-A"));
    expect(s.activeHistoryId).toBe("h-A");
  });

  it("restoreHistoryEntry dispatches setGraphData and marks the entry active", () => {
    let state = reducer(undefined, addHistoryEntry(entry("A", ["A", "n1"])));
    const dispatch = jest.fn((action) => {
      if (typeof action === "function") return action(dispatch, getState);
      state = reducer(state, action);
      return action;
    });
    const getState = () => ({ savedGraphs: state });

    restoreHistoryEntry("h-A")(dispatch, getState);

    expect(state.activeHistoryId).toBe("h-A");
    const setGraphDataCall = dispatch.mock.calls.find(
      ([action]) => action.type === "graph/setGraphData",
    );
    expect(setGraphDataCall).toBeDefined();
    expect(setGraphDataCall[0].payload.isRestore).toBe(true);
  });

  it("updateHistoryEntry refreshes an entry's subgraph and thumbnail in place", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    s = reducer(
      s,
      updateHistoryEntry({
        id: "h-A",
        subgraph: {
          nodes: [
            { _id: "A", id: "A" },
            { _id: "n9", id: "n9" },
          ],
          links: [],
        },
        thumbnail: "data:image/png;base64,ZZZ",
      }),
    );
    expect(s.originHistory).toHaveLength(1);
    expect(s.originHistory[0].subgraph.nodes.map((n) => n._id)).toEqual(["A", "n9"]);
    expect(s.originHistory[0].thumbnail).toBe("data:image/png;base64,ZZZ");
  });

  it("updateHistoryEntry is a no-op for an unknown id", () => {
    const s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    const after = reducer(
      s,
      updateHistoryEntry({ id: "missing", subgraph: { nodes: [], links: [] } }),
    );
    expect(after.originHistory[0].subgraph.nodes).toHaveLength(1);
  });

  it("syncActiveHistoryEntry updates the active entry with the latest graph + thumbnail", () => {
    let state = reducer(undefined, addHistoryEntry(entry("A", ["A"]))); // A is active
    const dispatch = jest.fn((action) => {
      if (typeof action === "function") return action(dispatch, getState);
      state = reducer(state, action);
      return action;
    });
    const getState = () => ({ savedGraphs: state });

    const latest = {
      nodes: [
        { _id: "A", id: "A" },
        { _id: "n5", id: "n5" },
      ],
      links: [],
    };
    syncActiveHistoryEntry(latest, "thumb-1")(dispatch, getState);

    expect(state.originHistory[0].subgraph.nodes.map((n) => n._id)).toEqual(["A", "n5"]);
    expect(state.originHistory[0].thumbnail).toBe("thumb-1");
  });

  it("syncActiveHistoryEntry is a no-op when no entry is active", () => {
    let state = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    state = reducer(state, setActiveHistory(null));
    const before = JSON.stringify(state.originHistory);
    const dispatch = jest.fn((action) => {
      if (typeof action === "function") return action(dispatch, getState);
      state = reducer(state, action);
      return action;
    });
    const getState = () => ({ savedGraphs: state });

    syncActiveHistoryEntry({ nodes: [], links: [] }, "thumb")(dispatch, getState);

    expect(JSON.stringify(state.originHistory)).toBe(before);
  });

  it("restoring an entry after it was synced returns the most-recent graph, not the first capture", () => {
    // Reproduces the user-reported bug: the history card must restore the latest
    // version of the graph, not the snapshot taken when the origin first resolved.
    let state = reducer(undefined, addHistoryEntry(entry("A", ["A", "n1"]))); // initial capture
    const dispatch = jest.fn((action) => {
      if (typeof action === "function") return action(dispatch, getState);
      state = reducer(state, action);
      return action;
    });
    const getState = () => ({ savedGraphs: state });

    // The graph evolves (expanded to include n2) and settles → active entry synced.
    const evolved = {
      nodes: [
        { _id: "A", id: "A" },
        { _id: "n1", id: "n1" },
        { _id: "n2", id: "n2" },
      ],
      links: [],
    };
    syncActiveHistoryEntry(evolved, "thumb-latest")(dispatch, getState);

    // Restoring the card now yields the evolved graph.
    restoreHistoryEntry("h-A")(dispatch, getState);
    const setGraphDataCall = dispatch.mock.calls.find(
      ([action]) => action?.type === "graph/setGraphData",
    );
    expect(setGraphDataCall[0].payload.graphData.nodes.map((n) => n._id)).toEqual([
      "A",
      "n1",
      "n2",
    ]);
  });

  it("restoreHistoryEntry is a no-op for an unknown id", () => {
    const state = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    const dispatch = jest.fn();
    const getState = () => ({ savedGraphs: state });

    restoreHistoryEntry("missing")(dispatch, getState);

    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("selectOriginHistory", () => {
  it("returns the history array from state", () => {
    const state = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    expect(selectOriginHistory({ savedGraphs: state })).toHaveLength(1);
  });
});
