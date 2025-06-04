import SearchBar from "../../components/SearchBar/SearchBar";
import { useContext, useState, useRef, useEffect } from "react";
import ForceGraph from "../../components/ForceGraph/ForceGraph";
import { PrunedCollections } from "../../components/Contexts/Contexts";

const SearchPage = () => {
  const [nodeIds, setNodeIds] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const prunedCollections = useContext(PrunedCollections);
  const graphDisplayAreaRef = useRef(null);
  const [graphJustGenerated, setGraphJustGenerated] = useState(false);

  const generateGraph = (items) => {
    const newNodeIds = items.map((item) => item._id);
    setNodeIds(newNodeIds);
    if (items && items.length > 0) {
      setGraphJustGenerated(true);
    } else {
      // If generating with no items do not try to scroll
      setGraphJustGenerated(false);
    }
  };

  const addSelectedItem = (item) => {
    if (!selectedItems.find((selected) => selected._id === item._id)) {
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  const removeSelectedItem = (item) => {
    setSelectedItems((prev) => prev.filter((d) => d._id !== item._id));
  };

  // useEffect to handle scrolling
  useEffect(() => {
    // Scroll if the flag is true, nodeIds are present, and the ref is available
    if (
      graphJustGenerated &&
      nodeIds.length > 0 &&
      graphDisplayAreaRef.current
    ) {
      graphDisplayAreaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setGraphJustGenerated(false);
    }
  }, [graphJustGenerated, nodeIds]);

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
        {/* ... about content ... */}
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

      {nodeIds.length > 0 && (
        <div className="graph-display-area" ref={graphDisplayAreaRef}>
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
