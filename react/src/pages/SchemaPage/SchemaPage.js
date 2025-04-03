import React from "react";
import ForceGraph from "../../components/ForceGraph/ForceGraph";

const SchemaPage = () => {
  // Props for ForceGraph
  const nodeIds = ["CL/0000000"];
  const settings = {
    defaultDepth: 4,
    useFocusNodes: false,
    collectionsToPrune: [],
    useSchemaGraph: true,
  };

  return <ForceGraph nodeIds={nodeIds} settings={settings} />;
};

export default SchemaPage;
