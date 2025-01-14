import {useEffect, useState, useRef, useContext} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";
import jsPDF from 'jspdf';
import collectionsMapData from '../assets/collectionsMap.json';
import {DbNameContext, GraphNameContext} from "./Contexts";

/* TODO: Decide if default settings should be loaded from contexts */
const ForceGraph = ({ nodeIds: originNodeIds, heightRatio = 0.5, settings = {} }) => {

    // Init refs
    const chartContainerRef = useRef();

    // Init setting states
    const [depth, setDepth] = useState(settings["defaultDepth"] || 1);
    const [edgeDirection, setEdgeDirection] = useState(settings["edgeDirection"] || "ANY");
    const [setOperation, setSetOperation] = useState(settings["setOperation"] || "Intersection");
    const [collectionsToPrune, setCollectionsToPrune] = useState(settings["collectionsToPrune"] || []);
    const [nodesToPrune, setNodesToPrune] = useState(settings["nodesToPrune"] || []);
    const [nodeFontSize, setNodeFontSize] = useState(settings["nodeFontSize"] || 12);
    const [edgeFontSize, setEdgeFontSize] = useState(settings["edgeFontSize"] || 8);
    const [labelStates, setLabelStates] = useState(settings["labelStates"] || {".collection-label": false, ".link-label": false, ".node-label": false})
    const [useFocusNodes, setUseFocusNodes] = useState(("useFocusNodes" in settings) ? settings["useFocusNodes"] : true)

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

    // Init contexts
    const graphName = useContext(GraphNameContext);
    const dbName = useContext(DbNameContext);

    useEffect(() => {

        console.log(settings)

        fetchCollections().then(data => {
            // Set collections state
            setCollections(parseCollections(data))
        } );
        document.addEventListener('click', closePopupOnInteraction);
        return () => {
            document.removeEventListener('click', closePopupOnInteraction);
        };
    }, []);

    // Reset expanding and pruning when creating a new graph
    useEffect(() => {
        setNodesToPrune([])
        setGraphNodeIds(originNodeIds);
    }, [originNodeIds]);

    // Fetch new graph data on change
    useEffect(() => {
        // Ensure graph only renders once at a time
        let isMounted = true;
        getGraphData(graphNodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune, dbName).then(data => {
            if (isMounted) {
                setRawData(data);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [originNodeIds, graphNodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune]);

    // Parse set operation on change
    useEffect(() => {
        if (Object.keys(rawData).length !== 0) {
            setGraphData(performSetOperation(rawData, setOperation))
        }
    }, [rawData, setOperation])

    // Update graph if data changes
    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            const g = ForceGraphConstructor(graphData, {
                nodeGroup: d => d._id.split('/')[0],
                nodeGroups: collections,
                collectionsMap: collectionsMap,
                originNodeIds: useFocusNodes ? originNodeIds : [],
                nodeFontSize: nodeFontSize,
                linkFontSize: edgeFontSize,
                nodeHover: d => (d.label)? `${d.id}\n${d.label}` : `${d._id}`,
                label: d => d.label? d.label : d._id,
                onNodeClick: handleNodeClick,
                interactionCallback: closePopupOnInteraction,
                nodeStrength: -100,
                width: "2560",
                heightRatio: heightRatio,
            });
            setGraph(g)
        }
    }, [graphData]);

    // Remove and rerender graph on any changes
    useEffect(() => {
        if (graph){
            const chartContainer = d3.select('#chart-container');
            chartContainer.selectAll("*").remove();
            chartContainer.append(() => graph);
        }
    }, [graph])

    // Toggle labels when labelStates changes or graph is created
    useEffect(() => {
        // Check if 'graph' and 'graph.toggleLabels' are defined
        if (graph !== null && typeof graph.toggleLabels === 'function') {
            // If 'graph' and 'graph.toggleLabels' exist, call the toggleLabels method
            for (let labelClass in labelStates) {
                graph.toggleLabels(labelStates[labelClass], labelClass);
            }
            // Turn off simulation when labels turn on
            if (Object.values(labelStates).some(value => value === true)) {
                graph.toggleSimulation(false)
                setIsSimOn(false);
            }
        }
    }, [labelStates, graph]);

    let getGraphData = async (nodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune, dbName) => {
        let response = await fetch('/arango_api/graph/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                node_ids: nodeIds,
                depth: depth,
                graph_name: graphName,
                edge_direction: edgeDirection,
                collections_to_prune: collectionsToPrune,
                nodes_to_prune: nodesToPrune,
                db_name: dbName,
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return response.json();
    };

    function parseCollections(collections) {
        // Sort collections alphabetically
        return collections.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

    }

    function performSetOperation(data, operation) {
        const nodes = data.nodes;
        const links = data.links;

        // Function to get all node ids across all origin groups
        const getAllNodeIdsFromOrigins = (operation) => {
            const nodeIdsPerOrigin = Object.values(nodes).map(originGroup => {
                return new Set(originGroup.map(item => item.node._id));
            });

            if (operation === 'Intersection') {
                // For intersection, return the intersection of all node sets
                return nodeIdsPerOrigin.reduce((acc, nodeIdsSet) => {
                    if (acc === null) {
                        return nodeIdsSet;
                    }
                    return new Set([...acc].filter(id => nodeIdsSet.has(id)));
                }, null);
            }

            if (operation === 'Union') {
                // For union, return the union of all node sets
                return new Set(nodeIdsPerOrigin.flatMap(nodeIdsSet => [...nodeIdsSet]));
            }

            // TODO: While operation is correct under the parameters, it is not intuitive. Fix.
            if (operation === 'Symmetric Difference') {
                // For symmetric difference, return the symmetric difference of all node sets
                return nodeIdsPerOrigin.reduce((acc, nodeIdsSet) => {
                    if (acc === null) {
                        return nodeIdsSet;
                    }
                    const result = new Set();
                    // Add nodes in either set, but not both
                    acc.forEach(id => {
                        if (!nodeIdsSet.has(id)) {
                            result.add(id);
                        }
                    });
                    nodeIdsSet.forEach(id => {
                        if (!acc.has(id)) {
                            result.add(id);
                        }
                    });
                    return result;
                }, null);
            }

            throw new Error('Unknown operation');
        };

        // Function to add nodes from paths to the set
        const addNodesFromPathsToSet = (nodeIdsSet) => {
            Object.values(nodes).forEach(originGroup => {
                originGroup.forEach(item => {
                    if (nodeIdsSet.has(item.node._id)) {
                        // Add all vertices in the path to the set
                        item.path.vertices.forEach(vertex => {
                            nodeIdsSet.add(vertex._id);
                        });
                    }
                });
            });
        };

        let nodeIds = getAllNodeIdsFromOrigins(operation);

        // Add nodes from paths to the intersection set
        addNodesFromPathsToSet(nodeIds);

        // Set to track unique link pairs (_from, _to)
        const seenLinks = new Set();

        // Filter out links that don't have both _from and _to in the intersected node set, and remove duplicates
        const filteredLinks = links.filter(link => {
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

        // Collect nodes that are in the intersection
        const filteredNodes = [];
        Object.values(nodes).forEach(originGroup => {
            originGroup.forEach(item => {
                if (nodeIds.size != 0 && nodeIds.has(item.node._id)) {
                    filteredNodes.push(item.node);
                    nodeIds.delete(item.node._id)
                }
            });
        });

        // Return the result with filtered nodes and links
        return {
            nodes: filteredNodes,
            links: filteredLinks
        };
    }

    const fetchCollections = async () => {
        let response = await fetch('/arango_api/collections/');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return response.json();
    };

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
        getGraphData([clickedNodeId],
            1,
            graphName,
            'ANY',
            [],
            [])
            .then( data => {
                graph.updateGraph({
                    newNodes: data["nodes"][clickedNodeId].map(d => d["node"]),
                    newLinks: data["links"]
                });
            });
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
        graph.updateNodeFontSize(newFontSize)
    };

    const handleEdgeFontSizeChange = (event) => {
        const newFontSize = parseInt(event.target.value, 10);
        setEdgeFontSize(newFontSize);
        graph.updateLinkFontSize(newFontSize)
    };

    // Handle changing the checkboxes for collections
    const handleCollectionChange = (collectionName) => {
        setCollectionsToPrune((prev) =>
            prev.includes(collectionName)
                ? prev.filter(name => name !== collectionName)
                : [...prev, collectionName]
        );
    };

    const handleLabelToggle = (labelClass) => {
        setLabelStates(prevStates => {
            // Update the specific label state
            const newStates = { ...prevStates, [labelClass]: !prevStates[labelClass] };
            return newStates;
        });
    };

    const handleSimulationToggle = () => {
        // Turn off labels if turning on simulation
        if (!isSimOn) {
            setLabelStates(
                {".collection-label": false, ".link-label": false, ".node-label": false}
            );
        }
        graph.toggleSimulation(!isSimOn)
        setIsSimOn(!isSimOn);
    };

    const exportGraph = (format) => {
        const svgElement = chartContainerRef.current.querySelector('svg');
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let scaleFactor = 6;

            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;

            ctx.fillStyle = 'white';

            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scaleFactor, scaleFactor);
            ctx.drawImage(img, 0, 0);

            if (format === 'png') {
                // Export as PNG
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = imgData;
                link.download = 'graph.png';
                link.click();
            } else if (format === 'pdf') {
                // Export as PDF
                // TODO: set max size to PDF to ensure not truncated
                const pdf = new jsPDF('landscape', 'mm', [canvas.width, canvas.height]);
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save('graph.pdf');
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
          <button onClick={toggleOptionsVisibility} className="toggle-button background-color-white">
              {optionsVisible ? 'Toggle Options ▼' : 'Toggle Options ▲'}
          </button>
          <div className="graph-options" style={optionsVisible ? {display:"flex"} : {display:"none"}}>
              <div className="depth-picker">
                  <label htmlFor="depth-select">Select depth of edge traversal:</label>
                  <select id="depth-select" value={depth} onChange={handleDepthChange}>
                      {[0, 1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                              {value}
                          </option>
                      ))}
                  </select>
              </div>
              <div className="edge-direction-picker">
                  <label htmlFor="edge-direction-select">Select direction of edge traversal from origin:</label>
                  <select id="edge-direction-select" value={edgeDirection} onChange={handleEdgeDirectionChange}>
                      {["OUTBOUND", "INBOUND", "ANY", "DUAL"].map((value) => (
                          <option key={value} value={value}>
                              {value}
                          </option>
                      ))}
                  </select>
              </div>
              <div className="edge-direction-picker">
                  <label htmlFor="edge-direction-select">Select set operation for shown nodes (multi-origin graphs only)</label>
                  <select id="edge-direction-select" value={setOperation} onChange={handleOperationChange}>
                      {["Intersection", "Union", "Symmetric Difference"].map((value) => (
                          <option key={value} value={value}>
                              {value}
                          </option>
                      ))}
                  </select>
              </div>
              <div className="font-size-picker">
                  <div className="node-font-size-picker">
                      <label htmlFor="node-font-size-select">Select node font size:</label>
                      <select id="node-font-size-select" value={nodeFontSize} onChange={handleNodeFontSizeChange}>
                          {[4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32].map((size) => (
                              <option key={size} value={size}>
                                  {size}px
                              </option>
                          ))}
                      </select>
                  </div>
                  <div className="edge-font-size-picker">
                      <label htmlFor="edge-font-size-select">Select edge font size:</label>
                      <select id="edge-font-size-select" value={edgeFontSize} onChange={handleEdgeFontSizeChange}>
                          {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28].map((size) => (
                              <option key={size} value={size}>
                                  {size}px
                              </option>
                          ))}
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
                                  className={collectionsToPrune.includes(collection)? "background-color-light" : "background-color-bg"}
                              >
                                  {collectionsMap.has(collection)? collectionsMap.get(collection)["display_name"] : collection}
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="labels-toggle-container">
                  <label>Toggle Labels</label>
                  <div className="labels-toggle">
                      <div className="collection-toggle">
                          Collection
                          <label className="switch">
                              <input type="checkbox" checked={labelStates[".collection-label"]} onChange={() => handleLabelToggle(".collection-label")} />
                              <span className="slider round"></span>
                          </label>
                      </div>
                      <div className="edge-toggle">
                          Edge
                          <label className="switch">
                              <input type="checkbox" checked={labelStates[".link-label"]} onChange={() => handleLabelToggle(".link-label")} />
                              <span className="slider round"></span>
                          </label>
                      </div>
                      <div className="node-toggle">
                          Node
                          <label className="switch">
                              <input type="checkbox" checked={labelStates[".node-label"]} onChange={() => handleLabelToggle(".node-label")} />
                              <span className="slider round"></span>
                          </label>
                      </div>
                  </div>
              </div>
              <div className="simulation-toggle">
                  Toggle Simulation
                  <label className="switch">
                      <input type="checkbox" checked={isSimOn} onChange={handleSimulationToggle} />
                      <span className="slider round"></span>
                  </label>
              </div>
              <div className="export-buttons">
                  <button onClick={() => exportGraph('png')}>Download as PNG</button>
                  <button onClick={() => exportGraph('pdf')}>Download as PDF</button>
              </div>
          </div>
          <div id="chart-container" ref={chartContainerRef}></div>
          <div
              className="node-popup"
              style={popupVisible ?
                  {display:"flex",
                      left: `${popupPosition.x + 10}px`,
                      top: `${popupPosition.y + 10}px`,
                  } : {display:"none"}}
          >
              <a
                  className="popup-button"
                  href={`/#/browse/${clickedNodeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Go To Page
              </a>
              <button className="popup-button" onClick={handleExpand}>Expand</button>
              <button className="popup-button" onClick={handleCollapse}>Collapse</button>
              <button className="x-button" onClick={handlePopupClose}>X</button>
          </div>
      </div>
    )
}

export default ForceGraph
