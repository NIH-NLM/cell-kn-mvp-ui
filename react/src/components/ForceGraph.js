import {useEffect, useState} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";

const ForceGraph = ({ nodeIds: nodeIds, defaultDepth: defaultDepth = 2}) => {

    const [depth, setDepth] = useState(defaultDepth);
    const [graphData, setGraphData] = useState({});
    const [graphName, setGraphName] = useState("CL");
    const [edgeDirection, setEdgeDirection] = useState("OUTBOUND");
    const [collections, setCollections] = useState([]);
    const [collectionsToPrune, setCollectionsToPrune] = useState([]);
    const [optionsVisible, setOptionsVisible] = useState(false);

    useEffect(() => {

        fetchCollections().then(data => {
            console.log(data)
            setCollections(data)
        } );
    }, []);

    useEffect(() => {
        // Ensure graph only renders once at a time
        let isMounted = true;
        getGraph(nodeIds, depth, graphName, edgeDirection, collectionsToPrune).then(data => {
            if (isMounted) {
                setGraphData(data);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [nodeIds, depth, graphName, edgeDirection, collectionsToPrune]);

    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            //TODO: Review width/height
            let focusedGroupName = nodeIds.length > 1 ? "Vertices in Results" : "Current Vertex";
            const svg = ForceGraphConstructor(graphData, {
                nodeGroup: d => nodeIds.includes(d._id)? focusedGroupName : d._id.split('/')[0],
                nodeTitle: d => d.definition? `${d.term}\n\n${d.definition}` : `${d.term}`,
                label: d => d.label? d.label : d._id,
                nodeStrength: -100,
                width: "2560",
                height: "1280",
            });
            const chartContainer = d3.select('#chart-container');
            chartContainer.selectAll("*").remove();
            chartContainer.append(() => svg);
        }
    }, [graphData]);

    let getGraph = async (nodeIds, depth, graphName, edgeDirection, collectionsToPrune) => {
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
      </div>
    )
}

export default ForceGraph
