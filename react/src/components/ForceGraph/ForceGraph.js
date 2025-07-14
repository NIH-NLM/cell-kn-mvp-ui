import React, { useEffect, useState, useRef, memo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ActionCreators as UndoActionCreators } from "redux-undo";
import ForceGraphConstructor from "../ForceGraphConstructor/ForceGraphConstructor";
import collectionsMapData from "../../assets/collectionsMap.json";
import {
  LoadingBar,
  getLabel,
  parseCollections,
  fetchCollections,
  hasNodesInRawData,
} from "../Utils/Utils";
import {
  fetchAndProcessGraph,
  updateSetting,
  setGraphData,
  initializeGraph,
  setAvailableCollections,
} from "../../store/graphSlice";
import { performSetOperation } from "./setOperation";

const ForceGraph = ({ nodeIds: originNodeIdsFromProps }) => {
  // Redux dispatch init
  const dispatch = useDispatch();

  // Refs for D3 and the container element
  const wrapperRef = useRef();
  const svgRef = useRef();
  const graphInstanceRef = useRef(null);

  // Redux state
  const {
    settings,
    graphData,
    rawData,
    status,
    originNodeIds,
    canUndo,
    canRedo,
  } = useSelector((state) => ({
    settings: state.graph.present.settings,
    graphData: state.graph.present.graphData,
    rawData: state.graph.present.rawData,
    status: state.graph.present.status,
    originNodeIds: state.graph.present.originNodeIds,
    canUndo: state.graph.past.length > 0,
    canRedo: state.graph.future.length > 0,
  }));

  // Local state
  const [collections, setCollections] = useState([]);
  const collectionsMap = new Map(collectionsMapData);

  // UI state for side panel and tabs
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // UI state for the right-click popup menu
  const [popup, setPopup] = useState({
    visible: false,
    isEdge: false,
    nodeId: null,
    nodeLabel: null,
    position: { x: 0, y: 0 },
  });

  // Initialize or reset the graph when the input nodes change
  useEffect(() => {
    dispatch(initializeGraph({ nodeIds: originNodeIdsFromProps }));
  }, [originNodeIdsFromProps, dispatch]);

  // Fetch the list of available collections once
  useEffect(() => {
    fetchCollections(settings.graphType).then((data) => {
      const parsed = parseCollections(data);
      setCollections(parsed);
      dispatch(setAvailableCollections(parsed));
    });
  }, [dispatch]);

  // Get new data whenever settings change
  useEffect(() => {
    if (originNodeIds && originNodeIds.length > 0) {
      dispatch(fetchAndProcessGraph());
    }
  }, [
    originNodeIds,
    settings.depth,
    settings.edgeDirection,
    settings.allowedCollections,
    settings.findShortestPaths,
    settings.nodeLimit,
    settings.graphType,
    dispatch,
  ]);

  useEffect(() => {
    // Get the DOM node for the wrapper div
    const wrapperElement = wrapperRef.current;
    if (!wrapperElement) {
      return;
    }

    // Create a new ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const graphInstance = graphInstanceRef.current;
      if (!graphInstance) {
        return;
      }

      // Take first entry
      for (let entry of entries) {
        if (entry.target === wrapperElement) {
          const { width, height } = entry.contentRect;

          // Call resize on D3
          graphInstance.resize(width, height);
        }
      }
    });

    // Start observing the wrapper div for size changes
    resizeObserver.observe(wrapperElement);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Process data and update/create the D3 graph when new raw data arrives
  useEffect(() => {
    if (!graphInstanceRef.current) {
      const handleSimulationEnd = (finalNodes, finalLinks) => {
        dispatch(setGraphData({ nodes: finalNodes, links: finalLinks }));
      };

      // Create the instance
      const newGraphInstance = ForceGraphConstructor(
        svgRef.current,
        { nodes: [], links: [] }, // Start with empty data
        {
          onSimulationEnd: handleSimulationEnd,

          // Redux Options
          nodeFontSize: settings.nodeFontSize,
          linkFontSize: settings.edgeFontSize,
          originNodeIds: settings.useFocusNodes ? originNodeIds : [],
          labelStates: settings.labelStates,

          // Local states
          nodeGroups: collections,
          collectionsMap: collectionsMap,

          // Event handlers
          onNodeClick: handleNodeClick,
          interactionCallback: handlePopupClose,

          // Utility
          nodeGroup: (d) => d._id.split("/")[0],
          nodeHover: (d) => (d.label ? `${d._id}\n${d.label}` : `${d._id}`),
          label: getLabel,

          // Static D3 Config
          nodeStrength: -100,

          // Initial Sizing
          width: svgRef.current.clientWidth,
          height: svgRef.current.clientHeight,
        },
      );
      graphInstanceRef.current = newGraphInstance;
      // Ensure labels begin with correct toggle
      if (newGraphInstance.toggleLabels) {
        for (const labelClass in settings.labelStates) {
          const shouldShow = settings.labelStates[labelClass];
          newGraphInstance.toggleLabels(shouldShow, labelClass);
        }
      }
    }

    // Call updategraph when rawData changes
    if (status === "processing" && Object.keys(rawData).length > 0) {
      const processedData = performSetOperation(
        rawData,
        settings.setOperation,
        originNodeIds,
      );

      if (graphInstanceRef.current) {
        graphInstanceRef.current.updateGraph({
          newNodes: processedData.nodes,
          newLinks: processedData.links,
          resetData: true,
        });
      }
    }
  }, [rawData, settings.setOperation, status, originNodeIds, dispatch]);

  // Handle font size changes by calling D3 instance method
  useEffect(() => {
    if (graphInstanceRef.current?.updateNodeFontSize) {
      graphInstanceRef.current.updateNodeFontSize(settings.nodeFontSize);
    }
  }, [settings.nodeFontSize]);

  useEffect(() => {
    if (graphInstanceRef.current?.updateLinkFontSize) {
      graphInstanceRef.current.updateLinkFontSize(settings.edgeFontSize);
    }
  }, [settings.edgeFontSize]);

  // Handle label states changes
  useEffect(() => {
    if (graphInstanceRef.current?.toggleLabels) {
      for (const labelClass in settings.labelStates) {
        const shouldShow = settings.labelStates[labelClass];
        graphInstanceRef.current.toggleLabels(shouldShow, labelClass);
      }
    }
  }, [settings.labelStates]);

  // Redux handlers
  const handleSettingChange = useCallback(
    (setting, value) => {
      dispatch(updateSetting({ setting, value }));
    },
    [dispatch],
  );

  const handleUndo = () => dispatch(UndoActionCreators.undo());
  const handleRedo = () => dispatch(UndoActionCreators.redo());

  // Settings handlers
  const handleDepthChange = (event) =>
    handleSettingChange("depth", Number(event.target.value));
  const handleNodeLimitChange = (event) =>
    handleSettingChange("nodeLimit", Number(event.target.value));
  const handleEdgeDirectionChange = (event) =>
    handleSettingChange("edgeDirection", event.target.value);
  const handleOperationChange = (event) =>
    handleSettingChange("setOperation", event.target.value);
  const handleNodeFontSizeChange = (event) =>
    handleSettingChange("nodeFontSize", parseInt(event.target.value, 10));
  const handleEdgeFontSizeChange = (event) =>
    handleSettingChange("edgeFontSize", parseInt(event.target.value, 10));
  const handleLeafToggle = (event) =>
    handleSettingChange("collapseOnStart", event.target.checked);
  const handleShortestPathToggle = (event) =>
    handleSettingChange("findShortestPaths", event.target.checked);
  const handleGraphToggle = () => {
    const newGraphType =
      settings.graphType === "phenotypes" ? "ontologies" : "phenotypes";
    handleSettingChange("graphType", newGraphType);
  };
  const handleCollectionChange = (collectionName) => {
    const newAllowed = settings.allowedCollections.includes(collectionName)
      ? settings.allowedCollections.filter((name) => name !== collectionName) // Remove
      : [...settings.allowedCollections, collectionName]; // Add
    handleSettingChange("allowedCollections", newAllowed);
  };
  const handleAllOn = () => {
    const allCollectionNames = collections.map((c) => c);
    handleSettingChange("allowedCollections", allCollectionNames);
  };
  const handleAllOff = () => {
    handleSettingChange("allowedCollections", []);
  };
  const handleLabelToggle = (labelClass) => {
    const newLabelStates = {
      ...settings.labelStates,
      [labelClass]: !settings.labelStates[labelClass],
    };
    handleSettingChange("labelStates", newLabelStates);
  };

  // D3 Handlers
  const handleSimulationRestart = () => {
    if (graphInstanceRef.current?.updateGraph) {
      graphInstanceRef.current.updateGraph({ simulate: true });
    }
  };
  const handleExpand = () => {
    const nodeIdToExpand = popup.nodeId;
    if (!nodeIdToExpand) return;
    const getExpansionData = async () => {
      const response = await fetch("/arango_api/graph/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_ids: [nodeIdToExpand],
          depth: 1, // Expand depth 1 from clicks node
          edge_direction: "ANY",
          allowed_collections: settings.allowedCollections,
          node_limit: settings.nodeLimit,
          graph: settings.graphType,
        }),
      });
      if (!response.ok) throw new Error("Expansion fetch failed");
      return response.json();
    };

    getExpansionData()
      .then((data) => {
        if (
          graphInstanceRef.current &&
          data &&
          data.nodes &&
          data.nodes[nodeIdToExpand]
        ) {
          graphInstanceRef.current.updateGraph({
            newNodes: data.nodes[nodeIdToExpand].map((d) => d.node),
            newLinks: data.links || [],
            centerNodeId: nodeIdToExpand,
          });
        }
      })
      .catch((error) => console.error("Expansion failed:", error));

    handlePopupClose();
  };
  const handleCollapse = () => {
    if (graphInstanceRef.current && popup.nodeId) {
      graphInstanceRef.current.updateGraph({ collapseNodes: [popup.nodeId] });
    }
    handlePopupClose();
  };
  const handleRemove = () => {
    if (graphInstanceRef.current && popup.nodeId) {
      graphInstanceRef.current.updateGraph({
        collapseNodes: [popup.nodeId],
        removeNode: true,
      });
    }
    handlePopupClose();
  };

  // Local handlers
  const handleNodeClick = (e, nodeData) => {
    const chartRect = wrapperRef.current.getBoundingClientRect();
    setPopup({
      visible: true,
      nodeId: nodeData._id,
      nodeLabel: getLabel(nodeData),
      isEdge: nodeData._id.split("/")[0].includes("-"),
      position: {
        x: e.clientX - chartRect.left + 30,
        y: e.clientY - chartRect.top + 30,
      },
    });
  };

  const handlePopupClose = () => setPopup({ ...popup, visible: false });

  const toggleOptionsVisibility = () => setOptionsVisible(!optionsVisible);

  // Export graph
  const exportGraph = (format) => {
    if (!wrapperRef.current) return;
    const svgElement = wrapperRef.current.querySelector("svg");
    if (!svgElement) {
      console.error("SVG element not found for export.");
      return;
    }

    svgElement.style.backgroundColor = "white"; // Ensure white background

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    }); // Specify charset

    // Reset styles
    svgElement.style.backgroundColor = "";

    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      // Consider dynamic scaling based on SVG size or user input
      let scaleFactor = 4; // Increased scale factor for better resolution

      // Use viewBox for sizing if available, otherwise use width/height attributes
      const viewBox = svgElement.viewBox.baseVal;
      const svgWidth =
        viewBox && viewBox.width
          ? viewBox.width
          : svgElement.width.baseVal.value;
      const svgHeight =
        viewBox && viewBox.height
          ? viewBox.height
          : svgElement.height.baseVal.value;

      canvas.width = svgWidth * scaleFactor;
      canvas.height = svgHeight * scaleFactor;

      // Draw white background on canvas
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(scaleFactor, scaleFactor); // Scale context
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight); // Draw image at original size

      let downloadUrl;
      let filename;

      if (format === "png") {
        downloadUrl = canvas.toDataURL("image/png");
        filename = "graph.png";
      } else if (format === "jpeg") {
        downloadUrl = canvas.toDataURL("image/jpeg", 0.9); // Quality setting for JPEG
        filename = "graph.jpeg";
      } else if (format === "svg") {
        // For SVG, just use the blob URL directly
        downloadUrl = url;
        filename = "graph.svg";
      } else {
        console.error("Unsupported export format:", format);
        URL.revokeObjectURL(url); // Clean up blob URL
        return;
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link); // Append link to body for Firefox compatibility
      link.click();
      document.body.removeChild(link); // Clean up link

      // Revoke object URLs after download is initiated
      if (format !== "svg") {
        // SVG uses the url directly for download href
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = (e) => {
      console.error("Error loading SVG blob into image:", e);
      URL.revokeObjectURL(url); // Clean up blob URL on error
    };
    img.src = url; // Load the SVG blob URL into the Image object
  };

  return (
    <div
      className={`graph-component-wrapper ${optionsVisible ? "options-open" : "options-closed"}`}
    >
      <div className="graph-main-area">
        <button
          onClick={toggleOptionsVisibility}
          className="toggle-options-button"
          aria-expanded={optionsVisible}
          aria-controls="graph-options-panel"
        >
          {optionsVisible ? "> Hide Options" : "< Show Options"}
        </button>

        {status === "loading" && <LoadingBar />}

        <div
          id="chart-container-wrapper"
          ref={wrapperRef}
          style={{
            minHeight: "500px",
            position: "relative",
            flexGrow: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <svg ref={svgRef} style={{ width: "100%", height: "100%" }}></svg>
          {(status === "processing" || status === "succeeded") &&
            !hasNodesInRawData(rawData) && (
              <div className="no-data-message" style={{ position: "absolute" }}>
                No data meets the current criteria. Please adjust your filters.
              </div>
            )}
          {status === "failed" && (
            <div
              className="no-data-message error-message"
              style={{ position: "absolute" }}
            >
              Failed to fetch graph data. Please try again.
            </div>
          )}
        </div>

        <div
          className="node-popup"
          style={
            popup.visible
              ? {
                  display: "flex",
                  position: "absolute",
                  left: `${popup.position.x}px`,
                  top: `${popup.position.y}px`,
                }
              : { display: "none" }
          }
        >
          <a
            className="popup-button"
            href={`/#/collections/${popup.nodeId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Go To "{popup.nodeLabel}"
          </a>
          <button
            className="popup-button"
            onClick={handleExpand}
            style={{ display: !popup.isEdge ? "block" : "none" }}
          >
            Expand from "{popup.nodeLabel}"
          </button>
          <button
            className="popup-button"
            onClick={handleCollapse}
            style={{ display: !popup.isEdge ? "block" : "none" }}
          >
            Collapse Leaf Nodes
          </button>
          <button
            className="popup-button"
            onClick={handleRemove}
            style={{ display: !popup.isEdge ? "block" : "none" }}
          >
            Remove {popup.nodeLabel} & Leaf nodes
          </button>
          <button
            className="popup-close-button"
            onClick={handlePopupClose}
            aria-label="Close popup"
          >
            ×
          </button>
        </div>
      </div>

      <div
        id="graph-options-panel"
        className="graph-options-side-panel"
        data-testid="graph-options"
        style={{ display: optionsVisible ? "block" : "none" }}
      >
        <div className="option-group history-controls">
          <label>History:</label>
          <button onClick={handleUndo} disabled={!canUndo}>
            Undo
          </button>
          <button onClick={handleRedo} disabled={!canRedo}>
            Redo
          </button>
        </div>

        <div className="options-tabs-nav">
          <button
            className={`tab-button ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          {originNodeIds && originNodeIds.length >= 2 && (
            <button
              className={`tab-button ${activeTab === "multiNode" ? "active" : ""}`}
              onClick={() => setActiveTab("multiNode")}
            >
              Multi-Node
            </button>
          )}
          <button
            className={`tab-button ${activeTab === "collections" ? "active" : ""}`}
            onClick={() => setActiveTab("collections")}
          >
            Collections
          </button>
          <button
            className={`tab-button ${activeTab === "export" ? "active" : ""}`}
            onClick={() => setActiveTab("export")}
          >
            Export
          </button>
        </div>

        <div className="options-tabs-content">
          {activeTab === "general" && (
            <div id="tab-panel-general" className="tab-panel active">
              <div className="option-group">
                <label htmlFor="depth-select">Depth:</label>
                <select
                  id="depth-select"
                  value={settings.depth}
                  onChange={handleDepthChange}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="option-group font-size-picker">
                <div className="node-font-size-picker">
                  <label htmlFor="node-font-size-select">Node font size:</label>
                  <select
                    id="node-font-size-select"
                    value={settings.nodeFontSize}
                    onChange={handleNodeFontSizeChange}
                  >
                    {[
                      4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32,
                    ].map((size) => (
                      <option key={size} value={size}>
                        {size}px
                      </option>
                    ))}
                  </select>
                </div>
                <div className="edge-font-size-picker">
                  <label htmlFor="edge-font-size-select">Edge font size:</label>
                  <select
                    id="edge-font-size-select"
                    value={settings.edgeFontSize}
                    onChange={handleEdgeFontSizeChange}
                  >
                    {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28].map(
                      (size) => (
                        <option key={size} value={size}>
                          {size}px
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="option-group labels-toggle-container">
                <label>Toggle Labels:</label>
                <div className="labels-toggle">
                  {Object.entries(settings.labelStates).map(
                    ([labelKey, isChecked]) => (
                      <div className="label-toggle-item" key={labelKey}>
                        {labelKey
                          .replace(/-/g, " ")
                          .replace("label", "")
                          .trim()
                          .replace(/^\w/, (c) => c.toUpperCase())}
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleLabelToggle(labelKey)}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="option-group labels-toggle-container">
                <label>Collapse Leaf Nodes:</label>
                <div className="labels-toggle graph-source-toggle">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.collapseOnStart}
                      onChange={handleLeafToggle}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div className="option-group labels-toggle-container">
                <label>Graph Source:</label>
                <div className="labels-toggle graph-source-toggle">
                  Evidence
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.graphType === "ontologies"}
                      onChange={handleGraphToggle}
                    />
                    <span className="slider round"></span>
                  </label>
                  Knowledge
                </div>
              </div>

              <div className="option-group checkbox-container">
                <button
                  className="simulation-toggle background-color-bg"
                  onClick={handleSimulationRestart}
                >
                  Restart Simulation
                </button>
              </div>
            </div>
          )}

          {activeTab === "multiNode" &&
            originNodeIds &&
            originNodeIds.length >= 2 && (
              <div id="tab-panel-multiNode" className="tab-panel active">
                <div className="option-group multi-node">
                  <label htmlFor="set-operation-select">Graph operation:</label>
                  <select
                    id="set-operation-select"
                    value={settings.setOperation}
                    onChange={handleOperationChange}
                  >
                    {["Intersection", "Union", "Symmetric Difference"].map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="option-group multi-node">
                  Shortest Path
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.findShortestPaths}
                      onChange={handleShortestPathToggle}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            )}

          {activeTab === "collections" && (
            <div id="tab-panel-collections" className="tab-panel active">
              <div className="option-group collection-picker">
                <label>Active Collections:</label>
                <div className="checkboxes-container">
                  {collections.map((collection) => (
                    <div key={collection} className="checkbox-container">
                      <button
                        onClick={() => handleCollectionChange(collection)}
                        className={
                          settings.allowedCollections.includes(collection)
                            ? "collection-button-selected"
                            : "collection-button-deselected"
                        }
                      >
                        {collectionsMap.has(collection)
                          ? collectionsMap.get(collection)["display_name"]
                          : collection}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="checkboxes-container collection-controls">
                  <button
                    onClick={handleAllOn}
                    className={
                      settings.allowedCollections.length === collections.length
                        ? "collection-button-selected collection-button-all"
                        : "collection-button-deselected collection-button-all"
                    }
                    disabled={
                      settings.allowedCollections.length === collections.length
                    }
                  >
                    All On
                  </button>
                  <button
                    onClick={handleAllOff}
                    className={
                      settings.allowedCollections.length === 0
                        ? "collection-button-selected collection-button-all"
                        : "collection-button-deselected collection-button-all"
                    }
                    disabled={settings.allowedCollections.length === 0}
                  >
                    All Off
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "export" && (
            <div id="tab-panel-export" className="tab-panel active">
              <div className="option-group export-buttons">
                <label>Export Graph:</label>
                <button onClick={() => exportGraph("svg")}>
                  Download as SVG
                </button>
                <button onClick={() => exportGraph("png")}>
                  Download as PNG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ForceGraph);
