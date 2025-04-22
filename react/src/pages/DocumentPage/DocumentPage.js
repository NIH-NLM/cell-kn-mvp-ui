import React, { useState, useEffect, useContext } from "react";
import DocumentCard from "../../components/DocumentCard/DocumentCard";
import ForceGraph from "../../components/ForceGraph/ForceGraph";
import { PrunedCollections } from "../../components/Contexts/Contexts";
import { useParams } from "react-router-dom";
import { getTitle } from "../../components/Utils/Utils";

// Document as described in ArangoDB documentation
const DocumentPage = ({}) => {
  const { coll, id } = useParams();
  let [document, setDocument] = useState(null);

  // Modify the PrunedCollections context if this collection is part of that list
  const prunedCollections = useContext(PrunedCollections);
  const filteredPrunedCollections = prunedCollections.includes(coll)
    ? prunedCollections.filter((item) => item !== coll)
    : prunedCollections;

  useEffect(() => {
    getDocument().then((r) => setDocument(r));
  }, [id, coll]);

  let getDocument = async () => {
    let response = await fetch(`/arango_api/collection/${coll}/${id}/`);
    return response.json();
  };

  if (document) {
    return (
      <div className="document-card">
        <div className="document-item-header">
          <h1>{getTitle(document)}</h1>
          <span>{document.term}</span>
        </div>
        <div className="document-item-container">
          <DocumentCard document={document} />
          <ForceGraph
            nodeIds={[document._id]}
            heightRatio={1}
            settings={{ collectionsToPrune: filteredPrunedCollections }}
          />
        </div>
      </div>
    );
  } else {
    // TODO: Handle error
    return <div>Error</div>;
  }
};

export default DocumentPage;
