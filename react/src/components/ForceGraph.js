import {useEffect, useState, useRef, useContext} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";
import jsPDF from 'jspdf';
import {GraphNameContext} from "./Contexts";
import collectionsMapData from '../assets/collectionsMap.json';

const ForceGraph = ({ nodeIds: selectedNodeIds, defaultDepth: defaultDepth = 1}) => {

    // Init refs
    const chartContainerRef = useRef();

    // Init states
    const [depth, setDepth] = useState(defaultDepth);
    const [graphNodeIds, setGraphNodeIds] = useState(selectedNodeIds);
    const [rawData, setRawData] = useState({});
    const [graphData, setGraphData] = useState({});
    const [edgeDirection, setEdgeDirection] = useState("ANY");
    const [setOperation, setSetOperation] = useState("Intersection");
    const [collections, setCollections] = useState([]);
    const [collectionsToPrune, setCollectionsToPrune] = useState([]);
    const [nodesToPrune, setNodesToPrune] = useState([]);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [clickedNodeId, setClickedNodeId] = useState(null);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [nodeFontSize, setNodeFontSize] = useState(12);
    const [edgeFontSize, setEdgeFontSize] = useState(8);
    const [graph, setGraph] = useState(null);
    const [isSimOn, setIsSimOn] = useState(true);

    const graphName = useContext(GraphNameContext);
    const collectionsMap = new Map(collectionsMapData);

    useEffect(() => {

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
        setGraphNodeIds(selectedNodeIds);
    }, [selectedNodeIds]);

    // Fetch new graph data on change
    useEffect(() => {
        // Ensure graph only renders once at a time
        let isMounted = true;
        getGraphData(graphNodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune).then(data => {
            if (isMounted) {
                setRawData(data);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [selectedNodeIds, graphNodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune]);

    // Parse set operation on change
    useEffect(() => {
        if (Object.keys(rawData).length !== 0) {
            setGraphData(performSetOperation(rawData, setOperation))
        }
    }, [rawData, setOperation])

    // Update graph if data changes
    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            //TODO: Review width/height
            let focusedGroupName = selectedNodeIds.length > 1 ? "Vertices in Results" : "Current Vertex";
            const g = ForceGraphConstructor(graphData, {
                nodeGroup: d => d._id.split('/')[0],
                nodeGroups: collections,
                collectionsMap: collectionsMap,
                nodeFontSize: nodeFontSize,
                linkFontSize: edgeFontSize,
                nodeHover: d => (d.definition && d.term)? `${d.term}\n\n${d.definition}` : `${d._id}`,
                label: d => d.label? d.label : d._id,
                onNodeClick: handleNodeClick,
                interactionCallback: closePopupOnInteraction,
                nodeStrength: -100,
                width: "2560",
                height: "1280",
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

    let getGraphData = async (nodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune) => {
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
                nodes_to_prune: nodesToPrune
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

        // Function to add nodes from paths to the intersection set
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

        // Intersection operation: Get only nodes in the intersection and their paths
        const intersection = () => {
            let intersectionNodeIds = getAllNodeIdsFromOrigins('Intersection');

            // Add nodes from paths to the intersection set
            addNodesFromPathsToSet(intersectionNodeIds);

            // Filter out links that don't have both _from and _to in the intersected node set
            const filteredLinks = links.filter(link =>
                intersectionNodeIds.has(link._from) && intersectionNodeIds.has(link._to)
            );

            // Collect nodes that are in the intersection
            const filteredNodes = [];
            Object.values(nodes).forEach(originGroup => {
                originGroup.forEach(item => {
                    if (intersectionNodeIds.has(item.node._id)) {
                        filteredNodes.push(item.node);
                    }
                });
            });

            // Return the result with filtered nodes and links
            return {
                nodes: filteredNodes,
                links: filteredLinks
            };
        };

        // Symmetric Difference operation: Remove nodes that are in all groups, plus their paths
        const symmetricDifference = () => {
            let diffNodeIds = getAllNodeIdsFromOrigins('Symmetric Difference');

            // Add nodes from paths to the symmetric difference set
            addNodesFromPathsToSet(diffNodeIds);

            // Filter out links that don't have both _from and _to in the diff node set
            const filteredLinks = links.filter(link =>
                diffNodeIds.has(link._from) && diffNodeIds.has(link._to)
            );

            // Collect nodes that are in the symmetric difference
            const filteredNodes = [];
            Object.values(nodes).forEach(originGroup => {
                originGroup.forEach(item => {
                    if (diffNodeIds.has(item.node._id)) {
                        filteredNodes.push(item.node);
                    }
                });
            });

            // Return the result with filtered nodes and links
            return {
                nodes: filteredNodes,
                links: filteredLinks
            };
        };

        // Union operation: Get all nodes from all groups and their paths
        const union = () => {
            let unionNodeIds = getAllNodeIdsFromOrigins('Union');

            // Filter out links that don't have both _from and _to in the union node set
            const filteredLinks = links.filter(link =>
                unionNodeIds.has(link._from) && unionNodeIds.has(link._to)
            );

            // Collect nodes that are in the union
            const filteredNodes = [];
            Object.values(nodes).forEach(originGroup => {
                originGroup.forEach(item => {
                    if (unionNodeIds.has(item.node._id)) {
                        filteredNodes.push(item.node);
                    }
                });
            });

            // Return the result with all nodes and links
            return {
                nodes: filteredNodes,
                links: filteredLinks
            };
        };

        // Execute based on the operation
        switch (operation) {
            case 'Intersection':
                return intersection();
            case 'Union':
                return union();
            case 'Symmetric Difference':
                return symmetricDifference();
            default:
                throw new Error('Unknown operation');
        }
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

    const handleSimulationToggle = () => {
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
          <button onClick={toggleOptionsVisibility} className="toggle-button">
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
                                  type="button"
                                  id={collection}
                                  checked={!collectionsToPrune.includes(collection)}
                                  onClick={() => handleCollectionChange(collection)}
                                  className={!collectionsToPrune.includes(collection)? "background-color-light" : "background-color-gray"}
                              >
                                  {collectionsMap.has(collection)? collectionsMap.get(collection)["display_name"] : collection}
                              </button>
                          </div>
                      ))}
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
                  href={`/#/${clickedNodeId}`}
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
