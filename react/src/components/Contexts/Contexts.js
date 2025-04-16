import { createContext, useContext, useState } from "react";

/* Collections Context */
export const PrunedCollections = createContext(["NCBITaxon"]);

/* Graph Context */
const defaultGraphContextValue = {
  graph: "phenotypes",
  setGraph: () => {
    // Default no-op function
    console.warn("Attempted to set graph outside of GraphProvider");
  },
};

// Create a Provider Component
export const GraphProvider = ({ children }) => {
  const [graph, setGraph] = useState("phenotypes");
  const providerValue = {
    graph,
    setGraph,
  };
  return (
    <GraphContext.Provider value={providerValue}>
      {children}
    </GraphContext.Provider>
  );
};

// Create context
export const GraphContext = createContext(defaultGraphContextValue);
