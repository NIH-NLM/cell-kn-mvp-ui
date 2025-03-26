import { useEffect, useState, useRef, useContext } from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "../ForceGraphConstructor/ForceGraphConstructor";
import collectionsMapData from "../../assets/collectionsMap.json";
import {
  DbNameContext,
  GraphNameContext,
  PrunedCollections,
} from "../Contexts/Contexts";
import { fetchCollections, parseCollections } from "../Utils/Utils";

/* TODO: Decide if default settings should be loaded from contexts */
const ForceGraph = ({
  nodeIds: originNodeIds,
  heightRatio = 0.5,
  settings = {},
}) => {
  // Init refs
  const chartContainerRef = useRef();

  // Init setting states
  const [depth, setDepth] = useState(settings["defaultDepth"] || 1);
  const [edgeDirection, setEdgeDirection] = useState(
    settings["edgeDirection"] || "ANY",
  );
  const [setOperation, setSetOperation] = useState(
    settings["setOperation"] || "Union",
  );
  const prunedCollectionsContext = useContext(PrunedCollections);
  const [collectionsToPrune, setCollectionsToPrune] = useState(
    settings["collectionsToPrune"] || prunedCollectionsContext,
  );
  const [nodesToPrune, setNodesToPrune] = useState(
    settings["nodesToPrune"] || [],
  );
  const [nodeFontSize, setNodeFontSize] = useState(
    settings["nodeFontSize"] || 12,
  );
  const [edgeFontSize, setEdgeFontSize] = useState(
    settings["edgeFontSize"] || 8,
  );
  const [nodeLimit, setNodeLimit] = useState(settings["nodeLimit"] || 100);
  const [labelStates, setLabelStates] = useState(
    settings["labelStates"] || {
      ".collection-label": false,
      ".link-label": true,
      ".node-label": true,
    },
  );
  const [findShortestPaths, setFindShortestPaths] = useState(
    "findShortestPaths" in settings ? settings["findShortestPaths"] : false,
  );
  const [useFocusNodes, setUseFocusNodes] = useState(
    "useFocusNodes" in settings ? settings["useFocusNodes"] : true,
  );

  // Init other states
  const [graphNodeIds, setGraphNodeIds] = useState(originNodeIds);
  const [rawData, setRawData] = useState({});
  const [graphData, setGraphData] = useState({});
  const [collections, setCollections] = useState([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [clickedNodeId, setClickedNodeId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [graph, setGraph] = useState(null);
  const [isSimOn, setIsSimOn] = useState(true);
  const collectionsMap = new Map(collectionsMapData);
  const [showNoDataPopup, setShowNoDataPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Init contexts
  const graphName = useContext(GraphNameContext);
  const dbName = useContext(DbNameContext);

  useEffect(() => {
    fetchCollections().then((data) => {
      // Set collections state
      let tempCollections = parseCollections(data);
      setCollections(tempCollections);
      // Check if "collectionsToAllow" exists in settings and only allow that collection
      if (settings["collectionsToAllow"]) {
        const collectionsToAllow = settings["collectionsToAllow"];
        const collectionsToPruneFiltered = tempCollections.filter(
          (collection) => !collectionsToAllow.includes(collection),
        );
        setCollectionsToPrune(collectionsToPruneFiltered);
      }
    });

    document.addEventListener("click", closePopupOnInteraction);
    return () => {
      document.removeEventListener("click", closePopupOnInteraction);
    };
  }, []);

  // Reset expanding and pruning when creating a new graph
  useEffect(() => {
    setNodesToPrune([]);
    setGraphNodeIds(originNodeIds);
  }, [originNodeIds]);

  // Fetch new graph data on change
  useEffect(() => {
    // Ensure graph only renders once at a time
    let isMounted = true;
    setIsLoading(true);

    // Use setTimeout to allow React to render the loading state before proceeding with the async operation
    setTimeout(() => {
      getGraphData(
        graphNodeIds,
        findShortestPaths,
        depth,
        graphName,
        edgeDirection,
        collectionsToPrune,
        nodesToPrune,
        dbName,
        nodeLimit,
      ).then((data) => {
        if (isMounted) {
          setRawData(data);
        }
      });
    }, 0);

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [
    originNodeIds,
    graphNodeIds,
    depth,
    graphName,
    edgeDirection,
    collectionsToPrune,
    nodesToPrune,
    findShortestPaths,
    nodeLimit,
  ]);

  // Parse set operation on change
  useEffect(() => {
    if (Object.keys(rawData).length !== 0) {
      const processedData = performSetOperation(rawData, setOperation);

      // Check if data is empty after processing
      if (
        !processedData ||
        ((processedData.nodes == null || processedData.nodes.length === 0) &&
          (processedData.links == null || processedData.links.length === 0))
      ) {
        setGraphData(processedData);
        setShowNoDataPopup(true);
      } else {
        setGraphData(processedData);
        setShowNoDataPopup(false);
      }
    }
  }, [rawData, setOperation]);

  // Update graph if data changes
  useEffect(() => {
    const updateGraph = async () => {
      if (!showNoDataPopup && Object.keys(graphData).length !== 0) {
        const g = await new Promise((resolve) => {
          setTimeout(() => {
            const graphInstance = ForceGraphConstructor(graphData, {
              nodeGroup: (d) => d._id.split("/")[0],
              nodeGroups: collections,
              collectionsMap: collectionsMap,
              originNodeIds: useFocusNodes ? originNodeIds : [],
              nodeFontSize: nodeFontSize,
              linkFontSize: edgeFontSize,
              nodeHover: (d) => (d.label ? `${d.id}\n${d.label}` : `${d._id}`),
              label: (d) => (d.label ? d.label : d._id),
              onNodeClick: handleNodeClick,
              interactionCallback: closePopupOnInteraction,
              nodeStrength: -100,
              width: "2560",
              heightRatio: heightRatio,
              labelStates: labelStates,
            });
            resolve(graphInstance);
          }, 0);
        });

        setGraph(g);
        setIsLoading(false);
      } else {
        setGraph(null);
        setIsLoading(false);
      }
    };
    updateGraph();
  }, [graphData]);

  // Remove and rerender graph on any changes
  useEffect(() => {
    const chartContainer = d3.select("#chart-container");
    chartContainer.selectAll("*").remove();
    if (graph) {
      chartContainer.append(() => graph);
    }
  }, [graph]);

  // Toggle labels when labelStates changes or graph is created
  useEffect(() => {
    // Check if 'graph' and 'graph.toggleLabels' are defined
    if (graph !== null && typeof graph.toggleLabels === "function") {
      // If 'graph' and 'graph.toggleLabels' exist, call the toggleLabels method
      for (let labelClass in labelStates) {
        graph.toggleLabels(labelStates[labelClass], labelClass);
      }
    }
  }, [labelStates]);

  let getGraphData = async (
    nodeIds,
    shortestPaths,
    depth,
    graphName,
    edgeDirection,
    collectionsToPrune,
    nodesToPrune,
    dbName,
  ) => {
    if (shortestPaths) {
      let response = await fetch("/arango_api/shortest_paths/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          node_ids: nodeIds,
          graph_name: graphName,
          edge_direction: edgeDirection,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    } else {
      let response = await fetch("/arango_api/graph/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          node_ids: nodeIds,
          depth: depth,
          graph_name: graphName,
          edge_direction: edgeDirection,
          collections_to_prune: collectionsToPrune,
          nodes_to_prune: nodesToPrune,
          db_name: dbName,
          node_limit: nodeLimit,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    }
  };

  function performSetOperation(data, operation) {
    const nodes = data.nodes;
    const links = data.links;

    // Function to get all node ids across all origin groups
    const getAllNodeIdsFromOrigins = (operation) => {
      const nodeIdsPerOrigin = Object.values(nodes).map((originGroup) => {
        return new Set(originGroup.map((item) => item.node._id));
      });

      // Intersection returns the intersecting nodes and their connections of any two origin nodes
      if (operation === "Intersection") {
        const overlap = new Set();
        const nodeIdsPerOrigin = Object.values(nodes).map(
          (originGroup) => new Set(originGroup.map((item) => item.node._id)),
        );

        // Iterate over all pairs of origin groups
        for (let i = 0; i < nodeIdsPerOrigin.length; i++) {
          for (let j = i + 1; j < nodeIdsPerOrigin.length; j++) {
            // Find the intersection between origin group i and j
            const intersection = [...nodeIdsPerOrigin[i]].filter((id) =>
              nodeIdsPerOrigin[j].has(id),
            );

            // Add the intersection to the overlap set
            intersection.forEach((id) => overlap.add(id));
          }
        }

        return overlap;
      }

      // Union returns the union of all node sets
      if (operation === "Union") {
        return new Set(
          nodeIdsPerOrigin.flatMap((nodeIdsSet) => [...nodeIdsSet]),
        );
      }

      // TODO: While operation is correct under the parameters, it is not intuitive. Fix?
      // Symmetric difference returns the symmetric difference of all node sets
      if (operation === "Symmetric Difference") {
        return nodeIdsPerOrigin.reduce((acc, nodeIdsSet) => {
          if (acc === null) {
            return nodeIdsSet;
          }
          const result = new Set();
          // Add nodes in either set, but not both
          acc.forEach((id) => {
            if (!nodeIdsSet.has(id)) {
              result.add(id);
            }
          });
          nodeIdsSet.forEach((id) => {
            if (!acc.has(id)) {
              result.add(id);
            }
          });
          return result;
        }, null);
      }

      throw new Error("Unknown operation");
    };

    // Function to add nodes from paths to the set
    const addNodesFromPathsToSet = (nodeIdsSet) => {
      Object.values(nodes).forEach((originGroup) => {
        originGroup.forEach((item) => {
          if (nodeIdsSet.has(item.node._id)) {
            // Add all vertices in the path to the set
            item.path.vertices.forEach((vertex) => {
              nodeIdsSet.add(vertex._id);
            });
          }
        });
      });
    };

    let nodeIds = getAllNodeIdsFromOrigins(operation);

    // Add nodes from paths
    if (!findShortestPaths) {
      addNodesFromPathsToSet(nodeIds);
    }

    // Set to track unique link pairs (_from, _to)
    const seenLinks = new Set();

    // Filter out links that don't have both _from and _to in the node set, and remove duplicates
    const filteredLinks = links.filter((link) => {
      // Check if both _from and _to are in nodeIds
      if (nodeIds.has(link._from) && nodeIds.has(link._to)) {
        // Create a unique key for the link pair (_from, _to)
        const linkKey = `${link._from}-${link._to}`;

        // If the link pair hasn't been seen before, keep it, otherwise filter it out
        if (seenLinks.has(linkKey)) {
          return false;
        } else {
          seenLinks.add(linkKey);
          return true;
        }
      }
      return false;
    });

    // Collect nodes that are in the set
    const filteredNodes = [];
    Object.values(nodes).forEach((originGroup) => {
      originGroup.forEach((item) => {
        if (nodeIds.size != 0 && nodeIds.has(item.node._id)) {
          filteredNodes.push(item.node);
          nodeIds.delete(item.node._id);
        }
      });
    });

    // Return the result with filtered nodes and links
    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }

  // Handle right click on node
  const handleNodeClick = (e, nodeData) => {
    setClickedNodeId(nodeData.id);

    // Get the mouse position and current scroll state
    const { clientX, clientY } = e;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Adjust the popup position by adding the scroll offsets
    setPopupPosition({
      x: clientX + 10 + scrollX,
      y: clientY + 10 + scrollY,
    });
    setPopupVisible(true);
  };

  // Handle closing the node popup
  const handlePopupClose = () => {
    setPopupVisible(false);
  };

  // Handle expanding the graph from a specific node
  const handleExpand = () => {
    // Fetch graph data for new node
    getGraphData([clickedNodeId], false, 1, graphName, "ANY", [], []).then(
      (data) => {
        graph.updateGraph({
          newNodes: data["nodes"][clickedNodeId].map((d) => d["node"]),
          newLinks: data["links"],
          centerNodeId: clickedNodeId,
        });
      },
    );
  };

  // Handle collapsing part of the graph based on a specific node
  const handleCollapse = () => {
    graph.updateGraph({
      removeNodes: [clickedNodeId],
    });
  };

  // Handle closing node popup when panning or zooming the graph
  const closePopupOnInteraction = () => {
    setPopupVisible(false);
  };

  // Handle changing the search depth of the graph
  const handleDepthChange = (event) => {
    setDepth(Number(event.target.value));
  };

  // Handle changing the limit of nodes to be shown
  const handleNodeLimitChange = (event) => {
    setNodeLimit(Number(event.target.value));
  };

  // Handle changing the search direction of edges
  const handleEdgeDirectionChange = (event) => {
    setEdgeDirection(event.target.value);
  };

  // Handle changing the set operation
  const handleOperationChange = (event) => {
    setSetOperation(event.target.value);
  };

  const handleNodeFontSizeChange = (event) => {
    const newFontSize = parseInt(event.target.value, 10);
    setNodeFontSize(newFontSize);
    graph.updateNodeFontSize(newFontSize);
  };

  const handleEdgeFontSizeChange = (event) => {
    const newFontSize = parseInt(event.target.value, 10);
    setEdgeFontSize(newFontSize);
    graph.updateLinkFontSize(newFontSize);
  };

  // Handle changing the checkboxes for collections
  const handleCollectionChange = (collectionName) => {
    setCollectionsToPrune((prev) =>
      prev.includes(collectionName)
        ? prev.filter((name) => name !== collectionName)
        : [...prev, collectionName],
    );
  };

  // Remove all collections from the prune list
  const handleAllOn = () => {
    setCollectionsToPrune([]);
  };

  // Add all collections to the prune list
  const handleAllOff = () => {
    setCollectionsToPrune(collections);
  };

  const handleLabelToggle = (labelClass) => {
    setLabelStates((prevStates) => {
      // Update the specific label state
      const newStates = {
        ...prevStates,
        [labelClass]: !prevStates[labelClass],
      };
      return newStates;
    });
  };

  const handleShortestPathToggle = () => {
    setFindShortestPaths(!findShortestPaths);
  };

  const handleSimulationToggle = () => {
    // Turn off labels if turning on simulation
    if (!isSimOn) {
      setLabelStates({
        ".collection-label": false,
        ".link-label": false,
        ".node-label": false,
      });
    }
    graph.toggleSimulation(!isSimOn);
    setIsSimOn(!isSimOn);
  };

  const exportGraph = (format) => {
    const svgElement = chartContainerRef.current.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      let scaleFactor = 6;

      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;

      ctx.fillStyle = "white";

      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);

      if (format === "png") {
        // Export as PNG
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "graph.png";
        link.click();
      }

      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Handle toggling options
  const toggleOptionsVisibility = () => {
    setOptionsVisible(!optionsVisible);
  };

  return (
    <div className="graph-container">
      <button
        onClick={toggleOptionsVisibility}
        className="toggle-button background-color-white"
      >
        {optionsVisible ? "Toggle Options ▼" : "Toggle Options ▲"}
      </button>
      <div
        className="graph-options"
        data-testid="graph-options"
        style={optionsVisible ? { display: "flex" } : { display: "none" }}
      >
        <div className="depth-picker">
          <label htmlFor="depth-select">Depth:</label>
          <select id="depth-select" value={depth} onChange={handleDepthChange}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="edge-direction-picker">
          <label htmlFor="edge-direction-select">
            Edge traversal direction
          </label>
          <select
            id="edge-direction-select"
            value={edgeDirection}
            onChange={handleEdgeDirectionChange}
          >
            {["OUTBOUND", "INBOUND", "ANY"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="depth-picker">
          <label htmlFor="depth-select">Node Limit:</label>
          <select
            id="depth-select"
            value={nodeLimit}
            onChange={handleNodeLimitChange}
          >
            {[
              10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150,
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        {graphNodeIds.length >= 2 && (
          <div className="edge-direction-picker multi-node">
            <label htmlFor="edge-direction-select">Graph operation</label>
            <select
              id="edge-direction-select"
              value={setOperation}
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
        )}
        <div className="font-size-picker">
          <div className="node-font-size-picker">
            <label htmlFor="node-font-size-select">Node font size:</label>
            <select
              id="node-font-size-select"
              value={nodeFontSize}
              onChange={handleNodeFontSizeChange}
            >
              {[4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32].map(
                (size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="edge-font-size-picker">
            <label htmlFor="edge-font-size-select">Edge font size:</label>
            <select
              id="edge-font-size-select"
              value={edgeFontSize}
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
        <div className="collection-picker">
          <label>Select collections to include in graph traversal:</label>
          <div className="checkboxes-container">
            {collections.map((collection) => (
              <div key={collection} className="checkbox-container">
                <button
                  id={collection}
                  checked={!collectionsToPrune.includes(collection)}
                  onClick={() => handleCollectionChange(collection)}
                  className={
                    collectionsToPrune.includes(collection)
                      ? "background-color-light"
                      : "background-color-bg"
                  }
                >
                  {collectionsMap.has(collection)
                    ? collectionsMap.get(collection)["display_name"]
                    : collection}
                </button>
              </div>
            ))}
          </div>
          <div className="checkboxes-container">
            <div className="checkbox-container">
              <button
                onClick={() => handleAllOn()}
                className={
                  collectionsToPrune.length === 0
                    ? "background-color-bg"
                    : "background-color-light"
                }
              >
                All On
              </button>
            </div>
            <div className="checkbox-container">
              <button
                onClick={() => handleAllOff()}
                className={
                  collectionsToPrune === collections
                    ? "background-color-bg"
                    : "background-color-light"
                }
              >
                All Off
              </button>
            </div>
          </div>
        </div>
        <div className="labels-toggle-container">
          <label>Toggle Labels</label>
          <div className="labels-toggle">
            <div className="collection-toggle">
              Collection
              <label className="switch">
                <input
                  type="checkbox"
                  checked={labelStates[".collection-label"]}
                  onChange={() => handleLabelToggle(".collection-label")}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="edge-toggle">
              Edge
              <label className="switch">
                <input
                  type="checkbox"
                  checked={labelStates[".link-label"]}
                  onChange={() => handleLabelToggle(".link-label")}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="node-toggle">
              Node
              <label className="switch">
                <input
                  type="checkbox"
                  checked={labelStates[".node-label"]}
                  onChange={() => handleLabelToggle(".node-label")}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        {graphNodeIds.length >= 2 && (
          <div className="shortest-path-toggle multi-node">
            Shortest Path (Currently only works with first two nodes selected)
            <label className="switch" style={{ margin: "auto" }}>
              <input
                type="checkbox"
                checked={findShortestPaths}
                onChange={handleShortestPathToggle}
              />
              <span className="slider round"></span>
            </label>
          </div>
        )}
        {/* Hidden. To be removed if a use case is not found for toggling simulation manually */}
        <div className="simulation-toggle" style={{ display: "none" }}>
          Toggle Simulation
          <label className="switch">
            <input
              type="checkbox"
              checked={isSimOn}
              onChange={handleSimulationToggle}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="export-buttons">
          <button onClick={() => exportGraph("png")}>Download as PNG</button>
        </div>
      </div>
      {isLoading && (
        <div className="loading-bar">
          <div className="progress"></div>
          Loading, please wait...
        </div>
      )}
      <div id="chart-container" ref={chartContainerRef}></div>
      {showNoDataPopup && (
        <div className="popup">
          <p>
            No data meets these criteria. Please adjust your options or refine
            your search.
          </p>
        </div>
      )}
      <div
        className="node-popup"
        style={
          popupVisible
            ? {
                display: "flex",
                left: `${popupPosition.x + 10}px`,
                top: `${popupPosition.y + 10}px`,
              }
            : { display: "none" }
        }
      >
        <a
          className="popup-button"
          href={`/#/browse/${clickedNodeId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Go To Page
        </a>
        <button className="popup-button" onClick={handleExpand}>
          Expand
        </button>
        <button className="popup-button" onClick={handleCollapse}>
          Collapse
        </button>
        <button className="x-button" onClick={handlePopupClose}>
          X
        </button>
      </div>
    </div>
  );
};

export default ForceGraph;
