import React from "react";
import ForceGraph from "../../components/ForceGraph/ForceGraph";
import {
  GraphNameContext,
  DbNameContext,
} from "../../components/Contexts/Contexts";

const SchemaPage = () => {
  // Set contexts
  // dbName string matches in arango_api/utils
  const dbName = "schema";
  // schemaGraphName must match with graph name in arangoDB
  const schemaGraphName = "KN-Schema-v0.7";

  // Props for ForceGraph
  const nodeIds = ["CL/0000000"];
  const settings = {
    defaultDepth: 4,
    useFocusNodes: false,
    collectionsToPrune: [],
  };

  return (
    // Wrapping ForceGraph with the overridden context providers
    <GraphNameContext.Provider value={schemaGraphName}>
      <DbNameContext.Provider value={dbName}>
        <ForceGraph nodeIds={nodeIds} settings={settings} />
      </DbNameContext.Provider>
    </GraphNameContext.Provider>
  );
};

export default SchemaPage;
