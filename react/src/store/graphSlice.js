import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import undoable from "redux-undo";

// Helper function to fetch data
const fetchGraphDataAPI = async (params) => {
  const {
    nodeIds,
    shortestPaths,
    depth,
    edgeDirection,
    allowedCollections,
    nodeLimit,
    graphType,
  } = params;
  const endpoint =
    shortestPaths && nodeIds.length > 1
      ? "/arango_api/shortest_paths/"
      : "/arango_api/graph/";

  const body =
    shortestPaths && nodeIds.length > 1
      ? { node_ids: nodeIds, edge_direction: edgeDirection }
      : {
          node_ids: nodeIds,
          depth,
          edge_direction: edgeDirection,
          allowed_collections: allowedCollections,
          node_limit: nodeLimit,
          graph: graphType,
        };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch from ${endpoint}`);
  }
  return response.json();
};

// AsyncThunk handles async api calls
export const fetchAndProcessGraph = createAsyncThunk(
  "graph/fetchAndProcess",
  async (_, { getState }) => {
    // Get Redux state
    const { settings, originNodeIds } = getState().graph.present;

    const params = {
      nodeIds: originNodeIds,
      shortestPaths: settings.findShortestPaths,
      depth: settings.depth,
      edgeDirection: settings.edgeDirection,
      allowedCollections: settings.allowedCollections,
      nodeLimit: settings.nodeLimit,
      graphType: settings.graphType,
    };

    try {
      const rawData = await fetchGraphDataAPI(params);
      return rawData;
    } catch (error) {
      console.error("Thunk fetch error:", error);
      throw error;
    }
  },
);

export const expandNode = createAsyncThunk(
  "graph/expandNode",
  async (nodeIdToExpand, { getState }) => {
    const { settings } = getState().graph.present;

    // Any direction, depth 1 for expand
    const response = await fetch("/arango_api/graph/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node_ids: [nodeIdToExpand],
        depth: 1,
        edge_direction: "ANY",
        allowed_collections: settings.allowedCollections,
        node_limit: settings.nodeLimit,
        graph: settings.graphType,
      }),
    });

    if (!response.ok) throw new Error("Expansion fetch failed");

    const expansionData = await response.json();

    return {
      newNodes: expansionData.nodes?.[nodeIdToExpand]?.map((d) => d.node) || [],
      newLinks: expansionData.links || [],
      centerNodeId: nodeIdToExpand,
    };
  },
);

// Define state, reducers, and actions
const initialState = {
  // ForceGraph component states
  settings: {
    depth: 2,
    edgeDirection: "ANY",
    setOperation: "Union",
    allowedCollections: [],
    nodeFontSize: 12,
    edgeFontSize: 8,
    nodeLimit: 5000,
    labelStates: {
      "collection-label": false,
      "link-source": false,
      "link-label": true,
      "node-label": true,
    },
    findShortestPaths: false,
    useFocusNodes: true,
    collapseOnStart: true,
    graphType: "phenotypes",
  },
  // Graph definition
  originNodeIds: [], // The initial search nodes
  rawData: {}, // Data from API call
  graphData: {
    // Processed data ready for D3
    nodes: [],
    links: [],
  },
  collapsedNodes: [],
  nodeToCenter: null,
  // Status for loading indicators
  status: "idle",
  error: null,
  lastActionType: null,
};

const graphSlice = createSlice({
  name: "graph",
  initialState,
  // Reducers handle synchronous state
  reducers: {
    // Action to update any setting
    updateSetting: (state, action) => {
      const { setting, value } = action.payload;
      state.settings[setting] = value;
      state.lastActionType = "updateSetting";
    },
    // Action to set the processed graph data, including node positions
    setGraphData: (state, action) => {
      state.graphData = action.payload;
      state.status = "succeeded";
      state.lastActionType = "setGraphData";
    },
    // Action to initialize the graph with new origin nodes
    initializeGraph: (state, action) => {
      state.originNodeIds = action.payload.nodeIds;
      // Reset state for new graph
      state.status = "idle";
      state.lastActionType = "initializeGraph";
      state.rawData = {};
      state.graphData = { nodes: [], links: [] };
    },
    // Action to set the available collections
    setAvailableCollections: (state, action) => {
      state.settings.allowedCollections = action.payload;
      state.lastActionType = "setAvailableCollections";
    },
    // Action to update node position state
    updateNodePosition: (state, action) => {
      const { nodeId, x, y } = action.payload;

      const nodeToUpdate = state.graphData.nodes.find(
        (node) => node.id === nodeId,
      );

      if (nodeToUpdate) {
        nodeToUpdate.x = x;
        nodeToUpdate.y = y;
      }
      state.lastActionType = "updateNodePosition";
    },
    // Action to set what nodes are currently collapsed
    setCollapsedNodes: (state, action) => {
      state.collapsedNodes = action.payload;
      state.lastActionType = "setCollapsedNodes";
    },
    // Action to remove node from collapse list
    uncollapseNode: (state, action) => {
      const nodeIdToUncollapse = action.payload;
      state.collapsedNodes = state.collapsedNodes.filter(
        (id) => id !== nodeIdToUncollapse,
      );
      state.lastActionType = "uncollapseNode";
    },
    // Clear centering state
    clearNodeToCenter: (state) => {
      state.nodeToCenter = null;
      state.lastActionType = "clearNodeToCenter";
    },
  },
  // Handle async thunks
  extraReducers: (builder) => {
    builder
      .addCase(fetchAndProcessGraph.pending, (state) => {
        state.status = "loading";
        state.lastActionType = "fetch/pending";
      })
      .addCase(fetchAndProcessGraph.fulfilled, (state, action) => {
        state.status = "processing";
        state.rawData = action.payload;
        state.lastActionType = "fetch/fulfilled";
      })
      .addCase(fetchAndProcessGraph.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
        state.lastActionType = "fetch/rejected";
      })
      .addCase(expandNode.pending, (state) => {
        state.lastActionType = "expand/pending";
      })
      .addCase(expandNode.fulfilled, (state, action) => {
        const { newNodes, newLinks } = action.payload;

        // Copy state to local
        const firstOrigin = state.originNodeIds[0];
        // Verify
        const currentNodes =
          firstOrigin && state.rawData.nodes[firstOrigin]
            ? [...state.rawData.nodes[firstOrigin]]
            : [];
        const currentLinks = [...(state.rawData.links || [])];
        const existingNodeIds = new Set(currentNodes.map((n) => n.node._id));
        const existingLinkIds = new Set(currentLinks.map((l) => l._id));

        // Merge
        newNodes.forEach((node) => {
          if (!existingNodeIds.has(node._id)) {
            currentNodes.push({ node: node, path: null });
          }
        });
        newLinks.forEach((link) => {
          if (!existingLinkIds.has(link._id)) {
            currentLinks.push(link);
          }
        });

        // Set state from local
        if (firstOrigin) {
          state.rawData.nodes[firstOrigin] = currentNodes;
        }
        state.rawData.links = currentLinks;

        // Save centerNodeId
        state.nodeToCenter = action.payload.centerNodeId;

        // Update status
        state.status = "processing";
        state.lastActionType = "expand/fulfilled";
      })
      .addCase(expandNode.rejected, (state, action) => {
        console.error("Expansion failed:", action.error.message);
        state.status = "failed";
        state.lastActionType = "expand/rejected";
      });
  },
});

export const {
  updateSetting,
  setGraphData,
  setCollapsedNodes,
  uncollapseNode,
  initializeGraph,
  setAvailableCollections,
  clearNodeToCenter,
  updateNodePosition,
} = graphSlice.actions;

// Undo wrapper
const undoableGraphReducer = undoable(graphSlice.reducer, {
  // Create history on setGraphData or updateNodePosition
  filter: (action, currentState, previousHistory) => {
    return (
      action.type === setGraphData.type ||
      action.type === updateNodePosition.type
    );
  },
  // Exclude other actions from triggering an undo state
  ignoreInitialState: true,
});

export default undoableGraphReducer;
