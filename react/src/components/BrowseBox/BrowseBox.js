import { Link } from "react-router-dom";
import { useEffect, useState, useContext } from "react";
import { fetchCollections, parseCollections } from "../Utils/Utils";
import collectionsMapData from "../../assets/collectionsMap.json";
import { GraphContext } from "../Contexts/Contexts";

const BrowseBox = ({ currentCollection }) => {
  const { graph, setGraph } = useContext(GraphContext);

  const [collections, setCollections] = useState([]);
  const collectionsMap = new Map(collectionsMapData);

  useEffect(() => {
    setCollections([]); // Clear old collections
    fetchCollections(graph).then((data) => {
      setCollections(parseCollections(data, collectionsMap));
    });
  }, [graph]);

  // Handler uses setGraph from context
  const handleGraphToggle = () => {
    const newGraphValue = graph === "phenotypes" ? "ontologies" : "phenotypes";
    setGraph(newGraphValue);
  };

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
                    : coll}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="graph-toggle-container">
        <div className="graph-toggle">
          <span className="label-toggle-item">Phenotypes</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={graph === "ontologies"}
              onChange={handleGraphToggle}
              aria-label="Toggle between Phenotypes and Ontologies"
            />
            <span className="slider round"></span>
          </label>
          <span className="label-toggle-item">Ontologies</span>
        </div>
      </div>
    </div>
  );
};

export default BrowseBox;
