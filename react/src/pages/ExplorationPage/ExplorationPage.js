import SearchPage from "../../components/SearchBar/SearchBar";
import Sunburst from "../../components/Sunburst/Sunburst";
import { useContext, useState } from "react";
import ForceGraph from "../../components/ForceGraph/ForceGraph";
import { PrunedCollections } from "../../components/Contexts/Contexts";

const ExplorationPage = () => {
  const [nodeIds, setNodeIds] = useState([]); // nodeIds will be used in the graph, separate from currently selected items
  const [selectedItems, setSelectedItems] = useState([]); // Track selected items

  const prunedCollections = useContext(PrunedCollections);

  // Update nodeIds to generate graph
  const generateGraph = (selectedItems) => {
    setNodeIds(selectedItems.map((item) => item._id));
  };

  // Add selected item to the list
  const addSelectedItem = (item) => {
    console.log(item);
    setSelectedItems((prev) => [...prev, item]);
  };

  // Remove selected item to the list
  const removeSelectedItem = (item) => {
    setSelectedItems((prev) => prev.filter((d) => d._id !== item._id));
  };

  return (
    <div className="exploration-page">
      <div className="sunburst-search-container">
        <Sunburst addSelectedItem={addSelectedItem} />
        <SearchPage
          generateGraph={generateGraph}
          selectedItems={selectedItems}
          addSelectedItem={addSelectedItem}
          removeSelectedItem={removeSelectedItem}
        />
      </div>
      {Object.keys(nodeIds).length > 0 && (
        <ForceGraph
          nodeIds={nodeIds}
          settings={{
            defaultDepth: 2,
            findShortestPaths: false,
            collectionsToPrune: prunedCollections,
          }}
        />
      )}
    </div>
  );
};

export default ExplorationPage;
