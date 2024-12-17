import {useContext, useEffect, useState} from "react";
import * as d3 from "d3";
import SunburstConstructor from "./SunburstConstructor";
import {GraphNameContext} from "./Contexts";

const Sunburst = () => {

    // TODO: Review using graphName as a state instead of a global variable
    const [graphData, setGraphData] = useState({});
    const [graph, setGraph] = useState(null);

    const graphName = useContext(GraphNameContext);

    // Fetch new graph data
    useEffect(() => {
        // Ensure graph only renders once at a time
        let isMounted = true;
        getGraphData(graphName).then(data => {
            if (isMounted) {
                setGraphData(data);
            }
        });

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, []);

    // Update graph if data changes
    useEffect(() => {
        if (Object.keys(graphData).length !== 0){
            //TODO: Review size
            const g = SunburstConstructor(graphData, 928);
            setGraph(g)
        }
    }, [graphData]);

    // Remove and rerender graph on any changes
    useEffect(() => {
        if (graph){
            const chartContainer = d3.select('#sunburst-container');
            chartContainer.selectAll("*").remove();
            chartContainer.append(() => graph);
        }
    }, [graph])

    let getGraphData = async (graphName) => {
        let response = await fetch('/arango_api/sunburst/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                graph_name: graphName,
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return response.json();
    };


    return (
            <div id="sunburst-container">
            </div>
        )
}

export default Sunburst
