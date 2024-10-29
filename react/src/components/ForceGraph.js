import {useEffect, useState} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";

const ForceGraph = ({ nodeIds: nodeIds, defaultDepth: defaultDepth = 2}) => {

    const [depth, setDepth] = useState(defaultDepth);
    const [graphData, setGraphData] = useState({});
    const [graphName, setGraphName] = useState("CL");

    useEffect(() => {
        getGraph(nodeIds, depth, graphName).then(data => {
            setGraphData(data);
        })
    }, [nodeIds, depth])

    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            //TODO: Review width/height
            const svg = ForceGraphConstructor(graphData, {
                nodeGroup: d => d._id.split('/')[0],
                nodeTitle: d => d.label? d.label : d._id,
                width: "1280",
                height: "640",
            });
            const chartContainer = d3.select('#chart-container');
            chartContainer.selectAll("*").remove();
            chartContainer.append(() => svg);
        }
    }, [graphData]);

    let getGraph = async (nodeIds, depth, graphName) => {
        console.log(depth)
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
            <label htmlFor="depth-select">Select Depth:</label>
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
