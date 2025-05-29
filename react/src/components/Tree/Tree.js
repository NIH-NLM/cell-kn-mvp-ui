import React, { useState, useEffect, useCallback, useRef } from "react";
import TreeConstructor from "../TreeConstructor/TreeConstructor";

const Tree = () => {
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isLoadingRef = useRef(false);

  const graphTypeForTree = "phenotypes";

  // Fetch Data
  const fetchTreeData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log("Fetch already in progress, skipping.");
      return;
    }
    setIsLoading(true);
    isLoadingRef.current = true;
    setError(null);

    const fetchUrl = "/arango_api/sunburst/"; // Use sunburst endpoint

    try {
      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: null, // Fetch the whole structure
          graph: graphTypeForTree,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          `Fetch failed: ${response.status} ${errText || response.statusText}`,
        );
      }

      const data = await response.json();

      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        console.error(
          "API response for tree data is not a single root object:",
          data,
        );
        throw new Error(
          "Invalid data format received for the tree: Expected a single root object.",
        );
      }

      setTreeData(data);
    } catch (fetchError) {
      console.error("Fetch/Process Error for Tree Data:", fetchError);
      setError(fetchError.message);
      setTreeData(null); // Clear data on error
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [graphTypeForTree]);

  // Effect to fetch data when the component mounts
  useEffect(() => {
    fetchTreeData();
  }, [fetchTreeData]);

  if (isLoading) {
    return <p>Loading tree data...</p>;
  }

  if (error) {
    return (
      <div>
        <p>Error loading tree data: {error}</p>
        <button onClick={fetchTreeData}>Try Again</button>
      </div>
    );
  }

  if (!treeData) {
    return <p>No tree data available.</p>;
  }

  return (
    <div className="tree-container">
      <h1>Interactive D3 Tree in React</h1>
      <TreeConstructor data={treeData} />
    </div>
  );
};

export default Tree;
