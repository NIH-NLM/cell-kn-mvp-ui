import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCollections, parseCollections } from "../Utils/Utils";
import collectionsMapData from "../../assets/collectionsMap.json";

const collectionsMap = new Map(collectionsMapData);

const BrowseBox = ({ currentCollection }) => {
  // -- Contexts --
  // const { graphType, setGraphType } = useContext(GraphContext);
  // Ignore context for focused queries
  const graphType = "phenotypes";

  const [collections, setCollections] = useState([]);

  useEffect(() => {
    setCollections([]); // Clear old collections
    fetchCollections(graphType).then((data) => {
      setCollections(parseCollections(data, collectionsMap));
    });
  }, [graphType]);

  return (
    <div className="browse-box-component-wrapper">
      <div className="browse-box-description">
        <h2 className="browse-box-title">Explore Data Collections</h2>
        <p>Select a collection from the list below to view its members.</p>
        <p>
          Once a collection is selected, you can often filter its members
          further. This allows for targeted exploration and discovery within
          specific data categories.
        </p>
      </div>

      <div className="browse-box-content">
        <div className="collections-list-panel">
          {collections.length === 0 ? (
            <p className="loading-collections-message">
              Loading collections...
            </p>
          ) : (
            <ul className="collections-list">
              {collections.map((collKey) => {
                const collectionInfo = collectionsMap.get(collKey);
                const displayName = collectionInfo?.display_name || collKey;
                const abbreviatedName =
                  collectionInfo?.abbreviated_name || collKey;
                const moreInfo =
                  collectionInfo?.more_info || `More about ${displayName}`;

                return (
                  <li key={collKey} className="collection-list-item">
                    <Link
                      to={`/collections/${collKey}`}
                      className={`collection-link ${collKey === currentCollection ? "active" : ""}`}
                      title={moreInfo}
                    >
                      <h3 className="collection-name">{displayName}</h3>
                      <span className="collection-abbreviation">
                        ({abbreviatedName})
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseBox;
