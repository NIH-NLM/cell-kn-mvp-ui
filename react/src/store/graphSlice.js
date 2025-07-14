import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import undoable, { ActionCreators, excludeAction } from "redux-undo";

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
  // Status for loading indicators
  status: "idle",
  error: null,
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
    },
    // Action to set the processed graph data, including node positions
    setGraphData: (state, action) => {
      state.graphData = action.payload;
      state.status = "succeeded";
    },
    // Action to initialize the graph with new origin nodes
    initializeGraph: (state, action) => {
      state.originNodeIds = action.payload.nodeIds;
      // Reset state for new graph
      state.status = "idle";
      state.rawData = {};
      state.graphData = { nodes: [], links: [] };
    },
    // Action to set the available collections
    setAvailableCollections: (state, action) => {
      state.settings.allowedCollections = action.payload;
    },
  },
  // Handle async thunks
  extraReducers: (builder) => {
    builder
      .addCase(fetchAndProcessGraph.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAndProcessGraph.fulfilled, (state, action) => {
        state.status = "processing";
        state.rawData = action.payload;
      })
      .addCase(fetchAndProcessGraph.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const {
  updateSetting,
  setGraphData,
  initializeGraph,
  setAvailableCollections,
} = graphSlice.actions;

// Undo wrapper
const undoableGraphReducer = undoable(graphSlice.reducer, {
  // Only include the `setGraphData` action in undo history
  filter: (action, currentState, previousHistory) => {
    return action.type === setGraphData.type;
  },
  // Exclude other actions from triggering an undo state
  ignoreInitialState: true,
});

export default undoableGraphReducer;
