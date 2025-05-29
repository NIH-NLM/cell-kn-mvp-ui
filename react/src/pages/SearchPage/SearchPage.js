import SearchBar from "../../components/SearchBar/SearchBar";
import { useContext, useState } from "react";
import ForceGraph from "../../components/ForceGraph/ForceGraph";
import { PrunedCollections } from "../../components/Contexts/Contexts";

const SearchPage = () => {
  const [nodeIds, setNodeIds] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const prunedCollections = useContext(PrunedCollections);

  const generateGraph = (items) => {
    setNodeIds(items.map((item) => item._id));
  };

  const addSelectedItem = (item) => {
    if (!selectedItems.find((selected) => selected._id === item._id)) {
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  const removeSelectedItem = (item) => {
    setSelectedItems((prev) => prev.filter((d) => d._id !== item._id));
  };

  return (
    <div className="search-page-layout">
      <div className="main-search-box">
        <h1 className="search-page-title">Search the Knowledge Network</h1>
        <div className="sunburst-search-container">
          <SearchBar
            generateGraph={() => generateGraph(selectedItems)}
            selectedItems={selectedItems}
            addSelectedItem={addSelectedItem}
            removeSelectedItem={removeSelectedItem}
          />
        </div>
      </div>

      <div className="about-section-container">
        <h2 className="about-title">About This Search</h2>
        <p>
          This tool enables the exploration of interconnected biological data.
          Use the search bar above to find genes, cells, diseases, chemical
          compounds, and other relevant entities.
        </p>
        <p>
          Select items from your search results to build a list. Once you have
          your items of interest, you can generate a network graph to visualize
          their relationships and discover new connections.
        </p>
      </div>

      {nodeIds.length > 0 && ( // Changed from Object.keys(nodeIds).length
        <div className="graph-display-area">
          {" "}
          {/* Wrapper for the graph */}
          <ForceGraph
            nodeIds={nodeIds}
            settings={{
              defaultDepth: 1,
              findShortestPaths: false,
              collectionsToPrune: prunedCollections,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SearchPage;
