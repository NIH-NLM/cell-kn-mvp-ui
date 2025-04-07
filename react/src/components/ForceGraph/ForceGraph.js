import { useEffect, useState, useRef, useContext } from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "../ForceGraphConstructor/ForceGraphConstructor";
import collectionsMapData from "../../assets/collectionsMap.json";
import { PrunedCollections } from "../Contexts/Contexts";
import { fetchCollections, parseCollections } from "../Utils/Utils";
import * as Utils from "../Utils/Utils";

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
  const [allowedCollections, setAllowedCollections] = useState(
    [],
  );
  const [nodeFontSize, setNodeFontSize] = useState(
    settings["nodeFontSize"] || 12,
  );
  const [edgeFontSize, setEdgeFontSize] = useState(
    settings["edgeFontSize"] || 8,
  );
  const [nodeLimit, setNodeLimit] = useState(settings["nodeLimit"] || 250);
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
  const [useSchemaGraph, setUseSchemaGraph] = useState(
    "useSchemaGraph" in settings ? settings["useSchemaGraph"] : false,
  );

  // Init other states
  const [graphNodeIds, setGraphNodeIds] = useState(originNodeIds);
  const [rawData, setRawData] = useState({});
  const [graphData, setGraphData] = useState({});
  const [collections, setCollections] = useState([]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [clickedNodeId, setClickedNodeId] = useState(null);
  const [clickedNodeLabel, setClickedNodeLabel] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [graph, setGraph] = useState(null);
  const [isSimOn, setIsSimOn] = useState(true);
  const collectionsMap = new Map(collectionsMapData);
  const [showNoDataPopup, setShowNoDataPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCollections().then((data) => {
      let tempCollections = parseCollections(data);
      setCollections(tempCollections);
      // Determine allowedCollections based on incoming settings:
      if (settings["allowedCollections"]) {
        // Use the explicitly provided allowed collections
        setAllowedCollections(settings["allowedCollections"]);
      } else if (settings["collectionsToPrune"]) {
        // If a prune list is provided, set allowedCollections to the complement
        const pruneList = settings["collectionsToPrune"];
        const allowed = tempCollections.filter(
          (collection) => !pruneList.includes(collection),
        );
        setAllowedCollections(allowed);
      } else {
        // By default, allow all collections
        setAllowedCollections(tempCollections);
      }
    });

    document.addEventListener("click", closePopupOnInteraction);
    return () => {
      document.removeEventListener("click", closePopupOnInteraction);
    };
  }, []);

  // Reset expanding and pruning when creating a new graph
  useEffect(() => {
    setGraphNodeIds(originNodeIds);
  }, [originNodeIds]);

  // Fetch new graph data on change
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    setTimeout(() => {
      getGraphData(
        graphNodeIds,
        findShortestPaths,
        depth,
        edgeDirection,
        allowedCollections,
        nodeLimit,
      ).then((data) => {
        if (isMounted) {
          setRawData(data);
        }
      });
    }, 0);

    return () => {
      isMounted = false;
    };
  }, [
    originNodeIds,
    graphNodeIds,
    depth,
    edgeDirection,
    allowedCollections,
    findShortestPaths,
    nodeLimit,
  ]);

  useEffect(() => {
    if (Object.keys(rawData).length !== 0) {
      const processedData = performSetOperation(rawData, setOperation);

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
              label: Utils.getLabel,
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

  useEffect(() => {
    const chartContainer = d3.select("#chart-container");
    chartContainer.selectAll("*").remove();
    if (graph) {
      chartContainer.append(() => graph);
    }
  }, [graph]);

  useEffect(() => {
    if (graph !== null && typeof graph.toggleLabels === "function") {
      for (let labelClass in labelStates) {
        graph.toggleLabels(labelStates[labelClass], labelClass);
      }
    }
  }, [labelStates]);

  let getGraphData = async (
    nodeIds,
    shortestPaths,
    depth,
    edgeDirection,
    allowedCollections,
    nodeLimit,
  ) => {
    if (shortestPaths) {
      let response = await fetch("/arango_api/shortest_paths/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          node_ids: nodeIds,
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
          edge_direction: edgeDirection,
          allowed_collections: allowedCollections,
          node_limit: nodeLimit,
          use_schema_graph: useSchemaGraph,
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

    const getAllNodeIdsFromOrigins = (operation) => {
      const nodeIdsPerOrigin = Object.values(nodes).map((originGroup) => {
        return new Set(originGroup.map((item) => item.node._id));
      });

      if (operation === "Intersection") {
        const overlap = new Set();
        const nodeIdsPerOrigin = Object.values(nodes).map(
          (originGroup) => new Set(originGroup.map((item) => item.node._id)),
        );

        for (let i = 0; i < nodeIdsPerOrigin.length; i++) {
          for (let j = i + 1; j < nodeIdsPerOrigin.length; j++) {
            const intersection = [...nodeIdsPerOrigin[i]].filter((id) =>
              nodeIdsPerOrigin[j].has(id),
            );

            intersection.forEach((id) => overlap.add(id));
          }
        }

        return overlap;
      }

      if (operation === "Union") {
        return new Set(
          nodeIdsPerOrigin.flatMap((nodeIdsSet) => [...nodeIdsSet]),
        );
      }

      if (operation === "Symmetric Difference") {
        return nodeIdsPerOrigin.reduce((acc, nodeIdsSet) => {
          if (acc === null) {
            return nodeIdsSet;
          }
          const result = new Set();
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

    const addNodesFromPathsToSet = (nodeIdsSet) => {
      Object.values(nodes).forEach((originGroup) => {
        originGroup.forEach((item) => {
          if (nodeIdsSet.has(item.node._id)) {
            item.path.vertices.forEach((vertex) => {
              nodeIdsSet.add(vertex._id);
            });
          }
        });
      });
    };

    let nodeIds = getAllNodeIdsFromOrigins(operation);

    if (!findShortestPaths) {
      addNodesFromPathsToSet(nodeIds);
    }

    const seenLinks = new Set();

    const filteredLinks = links.filter((link) => {
      if (nodeIds.has(link._from) && nodeIds.has(link._to)) {
        const linkKey = `${link._from}-${link._to}`;

        if (seenLinks.has(linkKey)) {
          return false;
        } else {
          seenLinks.add(linkKey);
          return true;
        }
      }
      return false;
    });

    const filteredNodes = [];
    Object.values(nodes).forEach((originGroup) => {
      originGroup.forEach((item) => {
        if (nodeIds.size !== 0 && nodeIds.has(item.node._id)) {
          filteredNodes.push(item.node);
          nodeIds.delete(item.node._id);
        }
      });
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }

  const handleNodeClick = (e, nodeData) => {
    setClickedNodeId(nodeData.id);
    setClickedNodeLabel(Utils.getLabel(nodeData));

    const { clientX, clientY } = e;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    setPopupPosition({
      x: clientX + 10 + scrollX,
      y: clientY + 10 + scrollY,
    });
    setPopupVisible(true);
  };

  const handlePopupClose = () => {
    setPopupVisible(false);
  };

  const handleExpand = () => {
    getGraphData([clickedNodeId], false, 1, "ANY", [], nodeLimit).then((data) => {
      graph.updateGraph({
        newNodes: data["nodes"][clickedNodeId].map((d) => d["node"]),
        newLinks: data["links"],
        centerNodeId: clickedNodeId,
      });
    });
  };

  const handleCollapse = () => {
    graph.updateGraph({
      collapseNodes: [clickedNodeId],
    });
  };

  const handleRemove = () => {
    graph.updateGraph({
      collapseNodes: [clickedNodeId],
      removeNode: true,
    });
  };

  const closePopupOnInteraction = () => {
    setPopupVisible(false);
  };

  const handleDepthChange = (event) => {
    setDepth(Number(event.target.value));
  };

  const handleNodeLimitChange = (event) => {
    setNodeLimit(Number(event.target.value));
  };

  const handleEdgeDirectionChange = (event) => {
    setEdgeDirection(event.target.value);
  };

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

  // Updated handler for toggling allowedCollections
  const handleCollectionChange = (collectionName) => {
    setAllowedCollections((prev) =>
      prev.includes(collectionName)
        ? prev.filter((name) => name !== collectionName)
        : [...prev, collectionName],
    );
  };

  const handleAllOn = () => {
    setAllowedCollections(collections);
  };

  const handleAllOff = () => {
    setAllowedCollections([]);
  };

  const handleLabelToggle = (labelClass) => {
    setLabelStates((prevStates) => {
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
          <label htmlFor="depth-select">Path Traversal Limit:</label>
          <select
            id="depth-select"
            value={nodeLimit}
            onChange={handleNodeLimitChange}
          >
            {[10, 50, 100, 150, 250, 500, 1000, 5000].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        {graphNodeIds && graphNodeIds.length >= 2 && (
          <div className="edge-direction-picker multi-node">
            <label htmlFor="edge-direction-select">Graph operation</label>
            <select
              id="edge-direction-select"
              value={setOperation}
              onChange={handleOperationChange}
            >
              {["Intersection", "Union", "Symmetric Difference"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
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
                  // Now checked if allowedCollections includes the collection
                  checked={allowedCollections.includes(collection)}
                  onClick={() => handleCollectionChange(collection)}
                  className={
                    allowedCollections.includes(collection)
                      ? "background-color-bg"
                      : "background-color-light"
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
                onClick={handleAllOn}
                className={
                  allowedCollections.length === collections.length
                      ? "background-color-bg"
                      : "background-color-light"
                }
              >
                All On
              </button>
            </div>
            <div className="checkbox-container">
              <button
                onClick={handleAllOff}
                className={
                  allowedCollections.length === 0
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
        {graphNodeIds && graphNodeIds.length >= 2 && (
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
          Go To "{clickedNodeLabel}"
        </a>
        <button className="popup-button" onClick={handleExpand}>
          Expand from "{clickedNodeLabel}"
        </button>
        <button className="popup-button" onClick={handleCollapse}>
          Collapse Satellite Nodes
        </button>
        <button className="popup-button" onClick={handleRemove}>
          Collapse and Remove
        </button>
        <button className="x-button" onClick={handlePopupClose}>
          X
        </button>
      </div>
    </div>
  );
};

export default ForceGraph;
