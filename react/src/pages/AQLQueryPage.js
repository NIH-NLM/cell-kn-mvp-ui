import { useEffect, useState } from "react";
import ForceGraph from "../components/ForceGraph/ForceGraph";

const AQLQueryPage = () => {
  const [queryTemplate, setQueryTemplate] = useState("");
  const [nodeIds, setNodeIds] = useState({});
  const [error, setError] = useState(null);
  const [predefinedQueries, setPredefinedQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState("");
  const [value1, setValue1] = useState("");
  const [value2, setValue2] = useState("");

  useEffect(() => {
    // Fetch predefined queries on component mount
    const fetchPredefinedQueries = async () => {
      try {
        const response = await fetch("/api/predefined-queries/");
        if (!response.ok) {
          throw new Error("Failed to fetch predefined queries");
        }
        const data = await response.json();
        setPredefinedQueries(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPredefinedQueries();
  }, []);

  const handleQueryChange = (event) => {
    const selectedId = event.target.value;
    const sq = predefinedQueries.find((q) => q.id === parseInt(selectedId));
    setSelectedQuery(sq);
    setQueryTemplate(sq ? sq.query : "");
  };

  function replaceAll(obj, replacements) {
    if (typeof obj === 'string') {
      // Replace placeholders in strings
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`@${key}`, 'g');
        obj = obj.replace(regex, replacements[key]);
      });
      return obj;
    }

    if (Array.isArray(obj)) {
      // Recurse through each item in the array
      return obj.map(item => replaceAll(item, replacements));
    }

    if (typeof obj === 'object' && obj !== null) {
      // Recurse through each key in the object
      const newObj = {};
      Object.keys(obj).forEach(key => {
        newObj[key] = replaceAll(obj[key], replacements);
      });
      return newObj;
    }

    // Return other data types as-is
    return obj;
  }

  const executeQuery = async () => {
    setError(null); // Reset any previous error
    try {
      const response = await fetch(`/arango_api/aql/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryTemplate
            .replace(/@value1/g, `${value1}`)
            .replace(/@value2/g, `${value2}`),
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Check if response has information
      if (data && data["nodes"] && data["nodes"][0]){
        //TODO: avoid hard-coding expected results?
        setNodeIds(data["nodes"].map((obj) => obj._id));
      } else {
        setError("Nothing found. Please refine your search and try again")
      }
    } catch (err) {
      // TODO: Fix error logic. Currently error will almost always be about mapping over null, given a blank return
      setError(err.message);
      setNodeIds([]); // Clear previous results on error
    }
  };

  return (
    <div className="aql-query-container">
      <div className="aql-query-input">
        <select onChange={handleQueryChange} defaultValue="">
          <option value="" disabled>
            Select a predefined query
          </option>
          {predefinedQueries.map((query) => (
            <option key={query.id} value={query.id}>
              {query.name}
            </option>
          ))}
        </select>
        {/* TODO: Dynamically decide how many placeholders there are based on the query itself */}
        <input
          type="text"
          placeholder={selectedQuery.placeholder_1}
          value={value1}
          onChange={(e) => setValue1(e.target.value)}
        />
        <input
          type="text"
          placeholder={selectedQuery.placeholder_2}
          value={value2}
          onChange={(e) => setValue2(e.target.value)}
        />
        <button onClick={executeQuery}>Execute</button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {Object.keys(nodeIds).length > 0 && (
        <ForceGraph nodeIds={nodeIds} settings={replaceAll(selectedQuery.settings, {"value1": value1, "value2": value2})} />
      )}
    </div>
  );
};

export default AQLQueryPage;
