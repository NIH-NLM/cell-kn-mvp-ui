import {useEffect, useState} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";

const ForceGraph = ({ nodeIds: nodeIds, defaultDepth: defaultDepth = 2}) => {

    const [depth, setDepth] = useState(defaultDepth);
    const [graphData, setGraphData] = useState({});
    const [graphName, setGraphName] = useState("CL");

    useEffect(() => {
        // Ensure graph only renders once at a time
        let isMounted = true;
        getGraph(nodeIds, depth, graphName).then(data => {
            if (isMounted) {
                setGraphData(data);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [nodeIds, depth, graphName]);

    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            //TODO: Review width/height
            const svg = ForceGraphConstructor(graphData, {
                nodeGroup: d => nodeIds.includes(d._id)? "Selected" : d._id.split('/')[0],
                nodeTitle: d => d.definition? `${d.term}\n\n${d.definition}` : `${d.term}`,
                nodeLabel: d => d.label? d.label : d._id,
                nodeStrength: -100,
                width: "1280",
                height: "640",
            });
            const chartContainer = d3.select('#chart-container');
            chartContainer.selectAll("*").remove();
            chartContainer.append(() => svg);
        }
    }, [graphData]);

    let getGraph = async (nodeIds, depth, graphName) => {
        let response = await fetch('/arango_api/graph/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                node_ids: nodeIds,
                depth: depth,
                graph_name: graphName,
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return response.json();
    };

    const handleDepthChange = (event) => {
        setDepth(Number(event.target.value));
    };

  return (
      <div>
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
      <div id="chart-container"></div>
    </div>
    )
}

export default ForceGraph
