import { Link } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { fetchCollections, parseCollections } from "../Utils/Utils";
import collectionsMapData from "../../assets/collectionsMap.json";

const BrowseBox = ({ currentCollection }) => {
  // -- Contexts --
  // const { graphType, setGraphType } = useContext(GraphContext);
  // Ignore context for focused queries
  const graphType = "phenotypes";

  const [collections, setCollections] = useState([]);
  const collectionsMap = new Map(collectionsMapData);

  useEffect(() => {
    setCollections([]); // Clear old collections
    fetchCollections(graphType).then((data) => {
      setCollections(parseCollections(data, collectionsMap));
    });
  }, [graphType]);

  return (
    <div className="browse-box-container">
      <div className="browse-box">
        <ul>
          {collections.map((coll) => (
            <li key={coll}>
              <Link
                to={`/browse/${coll}`}
                className={coll === currentCollection ? "active" : ""}
                title={
                  collectionsMap.has(coll)
                    ? collectionsMap.get(coll)["more_info"]
                    : ""
                }
              >
                <h3>
                  {collectionsMap.has(coll)
                    ? collectionsMap.get(coll)["display_name"]
                    : ""}{" "}
                  (
                  {collectionsMap.has(coll)
                    ? collectionsMap.get(coll)["abbreviated_name"]
                    : coll}
                  )
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BrowseBox;
