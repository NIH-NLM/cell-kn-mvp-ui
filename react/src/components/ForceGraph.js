import {useEffect, useState, useRef} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";
import {Link} from "react-router-dom";

const ForceGraph = ({ nodeIds: selectedNodeIds, defaultDepth: defaultDepth = 2}) => {

    const [depth, setDepth] = useState(defaultDepth);
    const [graphNodeIds, setGraphNodeIds] = useState(selectedNodeIds);
    const [graphData, setGraphData] = useState({});
    const [graphName, setGraphName] = useState("CL");
    const [edgeDirection, setEdgeDirection] = useState("ANY");
    const [collections, setCollections] = useState([]);
    const [collectionsToPrune, setCollectionsToPrune] = useState([]);
    const [nodesToPrune, setNodesToPrune] = useState([]);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [clickedNodeId, setClickedNodeId] = useState(null);
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {

        fetchCollections().then(data => {
            setCollections(data)
        } );
        document.addEventListener('click', closePopupOnInteraction);
        return () => {
            document.removeEventListener('click', closePopupOnInteraction);
        };
    }, []);

    useEffect(() => {
        // Reset expanding and pruning on new search
        setNodesToPrune([])
        setGraphNodeIds(selectedNodeIds);
    }, [selectedNodeIds]);

    useEffect(() => {
        // Ensure graph only renders once at a time
        let isMounted = true;
        getGraph(graphNodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune).then(data => {
            if (isMounted) {
                setGraphData(data);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [selectedNodeIds, graphNodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune]);

    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            //TODO: Review width/height
            let focusedGroupName = selectedNodeIds.length > 1 ? "Vertices in Results" : "Current Vertex";
            const svg = ForceGraphConstructor(graphData, {
                nodeGroup: d => selectedNodeIds.includes(d._id)? focusedGroupName : d._id.split('/')[0],
                nodeTitle: d => d.definition? `${d.term}\n\n${d.definition}` : `${d.term}`,
                label: d => d.label? d.label : d._id,
                onNodeClick: handleNodeClick,
                interactionCallback: closePopupOnInteraction,
                nodeStrength: -100,
                width: "2560",
                height: "1280",
            });
            const chartContainer = d3.select('#chart-container');
            chartContainer.selectAll("*").remove();
            chartContainer.append(() => svg);
        }
    }, [graphData]);

    let getGraph = async (nodeIds, depth, graphName, edgeDirection, collectionsToPrune, nodesToPrune) => {
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

    const handlePopupClose = () => {
        setPopupVisible(false);
    };

    const handleExpand = () => {
        setGraphNodeIds(graphNodeIds => [...graphNodeIds, clickedNodeId]);
    };

    const handleCollapse = () => {
        setNodesToPrune(nodesToPrune => [...nodesToPrune, clickedNodeId]);
    };

    const closePopupOnInteraction = () => {
      setPopupVisible(false);
    };

    const handleDepthChange = (event) => {
        setDepth(Number(event.target.value));
    };

    const handleEdgeDirectionChange = (event) => {
        setEdgeDirection(event.target.value);
    };

    const handleCheckboxChange = (collectionName) => {
        setCollectionsToPrune((prev) =>
            prev.includes(collectionName)
                ? prev.filter(name => name !== collectionName)
                : [...prev, collectionName]
        );
    };

    const toggleOptionsVisibility = () => {
        setOptionsVisible(!optionsVisible);
    };

  return (
      <div>
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
                      {["OUTBOUND", "INBOUND", "ANY"].map((value) => (
                          <option key={value} value={value}>
                              {value}
                          </option>
                      ))}
                  </select>
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
          </div>
          <div id="chart-container"></div>
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
              <button className="popup-button" onClick={handleExpand}>Set Additional Start Node</button>
              <button className="popup-button" onClick={handleCollapse}>Collapse</button>
              <button className="x-button" onClick={handlePopupClose}>X</button>
          </div>
      </div>
    )
}

export default ForceGraph
