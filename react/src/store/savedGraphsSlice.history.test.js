import reducer, {
  addHistoryEntry,
  deleteHistoryEntry,
  restoreHistoryEntry,
  selectOriginHistory,
  setActiveHistory,
  syncActiveHistoryEntry,
  updateHistoryEntry,
} from "./savedGraphsSlice";

const entry = (originId, nodeIds, id = `h-${originId}`) => ({
  id,
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
  it("addHistoryEntry appends one entry per capture", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A", "n1"])));
    s = reducer(s, addHistoryEntry(entry("B", ["B", "n2"])));
    expect(s.originHistory.map((e) => e.originId)).toEqual(["A", "B"]);
  });

  it("addHistoryEntry records a second entry when an origin is re-added", () => {
    // History is a timeline of origin events: toggling an origin off and back
    // on gets its own card, so the first card keeps the composition it was
    // captured from.
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"], "h-A-1")));
    s = reducer(s, addHistoryEntry(entry("B", ["B"], "h-B-1")));
    s = reducer(s, addHistoryEntry(entry("A", ["A", "B"], "h-A-2")));
    expect(s.originHistory.map((e) => e.id)).toEqual(["h-A-1", "h-B-1", "h-A-2"]);
    expect(s.originHistory.map((e) => e.originId)).toEqual(["A", "B", "A"]);
    expect(s.activeHistoryId).toBe("h-A-2");
    // The first A card is untouched by the second capture.
    expect(s.originHistory[0].subgraph.nodes.map((n) => n._id)).toEqual(["A"]);
  });

  it("addHistoryEntry does not store a checked field", () => {
    const s = reducer(undefined, addHistoryEntry({ ...entry("A", ["A"]), checked: true }));
    expect(s.originHistory[0].checked).toBeUndefined();
  });

  it("addHistoryEntry marks the new entry active", () => {
    const s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    expect(s.activeHistoryId).toBe("h-A");
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

  it("updateHistoryEntry keeps an existing thumbnail when the new capture failed", () => {
    // captureGraphThumbnail is best-effort and resolves to null on any failure.
    // A failed capture must never destroy the good picture a card already has.
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    s = reducer(s, updateHistoryEntry({ id: "h-A", thumbnail: "data:image/svg+xml,good" }));
    s = reducer(s, updateHistoryEntry({ id: "h-A", thumbnail: null }));
    expect(s.originHistory[0].thumbnail).toBe("data:image/svg+xml,good");
    s = reducer(s, updateHistoryEntry({ id: "h-A", thumbnail: "" }));
    expect(s.originHistory[0].thumbnail).toBe("data:image/svg+xml,good");
  });

  it("updateHistoryEntry still sets the first real thumbnail on an entry that has none", () => {
    let s = reducer(undefined, addHistoryEntry(entry("A", ["A"]))); // thumbnail: null
    s = reducer(s, updateHistoryEntry({ id: "h-A", thumbnail: "data:image/svg+xml,first" }));
    expect(s.originHistory[0].thumbnail).toBe("data:image/svg+xml,first");
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
    syncActiveHistoryEntry(latest, "thumb-1", "h-A")(dispatch, getState);

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

    syncActiveHistoryEntry({ nodes: [], links: [] }, "thumb", "h-A")(dispatch, getState);

    expect(JSON.stringify(state.originHistory)).toBe(before);
  });

  it("syncActiveHistoryEntry is a no-op when a different entry became active after the settle", () => {
    // The thumbnail capture between the settle and this dispatch is async, so
    // the entry that was active at settle time can be frozen and another one
    // activated meanwhile. The stale graph must land in neither card.
    let state = reducer(undefined, addHistoryEntry(entry("A", ["A"])));
    state = reducer(state, addHistoryEntry(entry("B", ["B"]))); // B is now active
    const before = JSON.stringify(state.originHistory);
    const dispatch = jest.fn((action) => {
      if (typeof action === "function") return action(dispatch, getState);
      state = reducer(state, action);
      return action;
    });
    const getState = () => ({ savedGraphs: state });

    // The settle fired while A was active.
    syncActiveHistoryEntry(
      { nodes: [{ _id: "stale", id: "stale" }], links: [] },
      "thumb",
      "h-A",
    )(dispatch, getState);

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
    syncActiveHistoryEntry(evolved, "thumb-latest", "h-A")(dispatch, getState);

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
