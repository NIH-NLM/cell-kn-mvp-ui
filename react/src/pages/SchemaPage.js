import React from "react";
import ForceGraph from "../components/ForceGraph";
import { GraphNameContext, DbNameContext } from "../components/Contexts";

const SchemaPage = () => {
  // Set contexts
  const schemaDbName = "schema";
  const schemaGraphName = "Cell-KN-BX";

  // Props for ForceGraph
  const nodeIds = ["Cell_type/Cell_type1"];
  const settings = { defaultDepth: 4, useFocusNodes: false };

  return (
    // Wrapping ForceGraph with the overridden context providers
    <GraphNameContext.Provider value={schemaGraphName}>
      <DbNameContext.Provider value={schemaDbName}>
        <ForceGraph nodeIds={nodeIds} settings={settings} />
      </DbNameContext.Provider>
    </GraphNameContext.Provider>
  );
};

export default SchemaPage;
