import { faBook, faDisease, faDna, faLungs, faMicroscope } from "@fortawesome/free-solid-svg-icons";
import ExampleSearches from "components/ExampleSearches";
import NetworkStats from "components/NetworkStats";
import SearchBar from "components/SearchBar";
import { GraphContext } from "contexts";
import { useSearch } from "hooks";
import { useContext } from "react";
import { Link } from "react-router-dom";

// Example searches spanning different entity types, each with a representative
// icon, to show the range of things the knowledge network can be searched for.
const EXAMPLES = [
  { term: "respiratory system", type: "Anatomical structure", icon: faLungs },
  { term: "pericyte", type: "Cell type", icon: faMicroscope },
  { term: "KCNK3", type: "Gene", icon: faDna },
  { term: "pulmonary hypertension", type: "Disease", icon: faDisease },
  { term: "Sikkema", type: "Publication", icon: faBook },
];

const SearchPage = () => {
  const { graphType } = useContext(GraphContext);
  const search = useSearch(graphType);

  const handlePickExample = (term) => {
    search.setQuery(term);
    search.setIsOpen(true);
  };

  return (
    <div className="search-page-layout">
      <div className="main-search-box">
        <h1 className="search-page-title">Search the Knowledge Network</h1>
        <div className="search-bar-wrapper">
          <SearchBar search={search} />
        </div>
        <ExampleSearches examples={EXAMPLES} onPick={handlePickExample} />
      </div>

      <NetworkStats />

      <div className="about-section-container">
        <h2 className="about-title">About NLM-CKN</h2>
        <p>
          The National Library of Medicine (NLM) Cell Knowledge Network is a knowledgebase focused
          on cell characteristics (phenotypes) derived from single-cell technologies. It integrates
          this information with data from reference ontologies, NCBI resources, and text mining
          efforts.
        </p>
        <p>
          The network is structured as a knowledge graph of biomedical entities (nodes) and their
          relationships (edges). This graph links experimental single-cell genomics data to the
          reference Cell Ontology, providing evidence for assertions and integrating information
          about cells, tissues, biomarkers, pathways, drugs, and diseases.
        </p>
        <p>
          Use the search bar above to find and explore entities within this network. You can add
          items to your graph or navigate to their specific pages.
          <Link to="/about" className="learn-more-link internal-learn-more">
            Learn more...
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SearchPage;
