import {useEffect, useState} from "react";
import * as d3 from "d3";
import ForceGraphConstructor from "./ForceGraphConstructor";

const ForceGraph = ({ nodeId: nodeId }) => {

    const [depth, setDepth] = useState(2);
    const [graphData, setGraphData] = useState({});

    useEffect(() => {
        getGraph(nodeId, depth).then(data => {
            setGraphData(data);
        })
    }, [nodeId, depth])

    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            console.log(graphData)
            const svg = ForceGraphConstructor(graphData, {
                nodeGroup: d => d._id.split('/')[0],
                nodeTitle: d => d.label? d.label : d._id,
                width: "100%",
                height: "640px",
            });
            const chartContainer = d3.select('#chart-container');
            chartContainer.selectAll("*").remove();
            chartContainer.append(() => svg);
        }
    }, [graphData]);

    let getGraph = async (nodeId, depth) => {
        // Escape slash in ID
        const encodedNodeId = encodeURIComponent(nodeId);
        let response = await fetch(`/arango_api/graph/${encodedNodeId}/${depth}`)
        return response.json()
    }

      const handleDepthChange = (event) => {
        setDepth(event.target.value);
      };

  return (
      <div>
          <div className="depth-picker">
            <label htmlFor="depth-select">Select Depth:</label>
            <select id="depth-select" value={depth} onChange={handleDepthChange}>
              {[1, 2, 3, 4, 5].map((value) => (
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
