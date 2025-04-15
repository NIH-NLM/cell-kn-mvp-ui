import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCollections, parseCollections } from "../Utils/Utils";
import collectionsMapData from "../../assets/collectionsMap.json";

const BrowseBox = ({ currentCollection }) => {
  const [collections, setCollections] = useState([]);
  const collectionsMap = new Map(collectionsMapData);

  useEffect(() => {
    fetchCollections("phenotypes").then((data) => {
      // Set collections state
      setCollections(parseCollections(data, collectionsMap));
    });
  }, []);

  return (
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
                  : coll}
              </h3>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BrowseBox;
