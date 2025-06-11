import SearchBar from "../../components/SearchBar/SearchBar";
import { useContext, useState, useRef, useEffect } from "react";
import ForceGraph from "../../components/ForceGraph/ForceGraph";
import { PrunedCollections } from "../../components/Contexts/Contexts";
import { Link } from "react-router-dom";

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

  useEffect(() => {
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
        <div className="search-bar-wrapper">
          {" "}
          {/* Renamed from sunburst-search-container for clarity */}
          <SearchBar
            generateGraph={() => generateGraph(selectedItems)}
            selectedItems={selectedItems}
            addSelectedItem={addSelectedItem}
            removeSelectedItem={removeSelectedItem}
          />
        </div>
      </div>

      <div className="about-section-container">
        <h2 className="about-title">About NCKN</h2>
        <p>
          The National Library of Medicine (NLM) Cell Knowledge Network is a
          knowledgebase focused on cell characteristics (phenotypes) derived
          from single-cell technologies. It integrates this information with
          data from reference ontologies, NCBI resources, and text mining
          efforts.
        </p>
        <p>
          The network is structured as a knowledge graph of biomedical entities
          (nodes) and their relationships (edges). This graph links experimental
          single-cell genomics data to the reference Cell Ontology, providing
          evidence for assertions and integrating information about cells,
          tissues, biomarkers, pathways, drugs, and diseases.
        </p>
        <p>
          Use the search bar above to find and explore entities within this
          network. Selected items can be used to generate interactive graphs
          visualizing their connections.
          <Link to="/about" className="learn-more-link internal-learn-more">
            Learn more...
          </Link>
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
