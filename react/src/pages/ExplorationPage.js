import SearchPage from "./SearchPage";
import Sunburst from "../components/Sunburst";
import {useState} from "react";
import ForceGraph from "../components/ForceGraph";

const ExplorationPage = () => {

    const [nodeIds, setNodeIds] = useState([]); // nodeIds will be used in the graph, separate from currently selected items

    // Update nodeIds to generate graph
    const generateGraph = (selectedItems) => {
        setNodeIds(selectedItems.map((item) => item._id));
    };

    return (
        <div className="exploration-page">
            <div className="sunburst-search-container">
                <Sunburst />
                <SearchPage generateGraph={generateGraph}/>
            </div>
            {Object.keys(nodeIds).length > 0 && (
                <ForceGraph nodeIds={nodeIds} defaultDepth={2} />
            )}
        </div>
    )
}

export default ExplorationPage
