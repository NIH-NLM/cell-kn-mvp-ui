import {useEffect, useState, useRef} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";
import jsPDF from 'jspdf';

const ForceGraph = ({ nodeIds: selectedNodeIds, defaultDepth: defaultDepth = 1}) => {

    // Init refs
    const chartContainerRef = useRef();

    // Init states
    const [depth, setDepth] = useState(defaultDepth);
    const [graphNodeIds, setGraphNodeIds] = useState(selectedNodeIds);
    const [graphData, setGraphData] = useState({});
    // TODO: Review using graphName as a state instead of a global variable
    const [graphName, setGraphName] = useState("CL-Full");
    const [edgeDirection, setEdgeDirection] = useState("ANY");
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

    useEffect(() => {

        fetchCollections().then(data => {
            // Sort alphabetically, ignoring case
            setCollections(data.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())))
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
                setGraphData(data);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [selectedNodeIds, graphNodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune]);

    // Update graph if data changes
    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            //TODO: Review width/height
            let focusedGroupName = selectedNodeIds.length > 1 ? "Vertices in Results" : "Current Vertex";
            const g = ForceGraphConstructor(graphData, {
                nodeGroup: d => d._id.split('/')[0],
                nodeGroups: collections,
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
                    newNodes: data["nodes"],
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
    const handleCheckboxChange = (collectionName) => {
        setCollectionsToPrune((prev) =>
            prev.includes(collectionName)
                ? prev.filter(name => name !== collectionName)
                : [...prev, collectionName]
        );
    };

    const handleToggle = () => {
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
                  <label htmlFor="depth-select">Select depth of edges from CL vertices:</label>
                  <select id="depth-select" value={depth} onChange={handleDepthChange}>
                      {[0, 1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                              {value}
                          </option>
                      ))}
                  </select>
              </div>
              <div className="edge-direction-picker">
                  <label htmlFor="edge-direction-select">Select direction of edge traversal from CL vertices:</label>
                  <select id="edge-direction-select" value={edgeDirection} onChange={handleEdgeDirectionChange}>
                      {["OUTBOUND", "INBOUND", "ANY", "DUAL"].map((value) => (
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
                              <input
                                  type="checkbox"
                                  id={collection}
                                  checked={!collectionsToPrune.includes(collection)}
                                  onChange={() => handleCheckboxChange(collection)}
                              />
                              <label htmlFor={collection}>{collection}</label>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="simulation-toggle">
                  <label >Toggle Simulation</label>
                  <input type="checkbox" checked={isSimOn} onChange={handleToggle} />
                  <span className="slider"></span>
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
