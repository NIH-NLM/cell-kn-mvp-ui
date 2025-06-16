import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import DocumentCard from "../../components/DocumentCard/DocumentCard";
import ForceGraph from "../../components/ForceGraph/ForceGraph";
import { PrunedCollections } from "../../components/Contexts/Contexts";
import { getTitle, parseId } from "../../components/Utils/Utils";

const DocumentPage = () => {
  const { coll, id } = useParams();
  const [document, setDocument] = useState(null);
  const [nodeIds, setNodeIds] = useState(null);

  const prunedCollections = useContext(PrunedCollections);

  const filteredPrunedCollections = prunedCollections.includes(coll)
    ? prunedCollections.filter((item) => item !== coll)
    : prunedCollections;

  useEffect(() => {
    const getDocument = async () => {
      try {
        const response = await fetch(`/arango_api/collection/${coll}/${id}/`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDocument(data);
        setNodeIds(parseId(data));
      } catch (error) {
        console.error("Failed to fetch document:", error);

        setDocument(null);
      }
    };

    if (id && coll) {
      setDocument(null);
      getDocument();
    }
  }, [id, coll]);

  const isLoading = !document && id && coll;

  if (isLoading) {
    return (
      <div className="content-page-layout">
        {" "}
        <div className="loading-message">Loading document details...</div>{" "}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="content-page-layout">
        <div className="error-message">
          Document not found or failed to load. Please check the URL or try
          again.
        </div>
      </div>
    );
  }

  // Document is loaded
  return (
    <div className="content-page-layout document-details-page-layout">
      <div className="content-box document-details-content-box">
        <div className="document-item-header">
          <h1>{getTitle(document)}</h1>
          {document.term && <span>Term: {document.term}</span>}{" "}
        </div>

        <div className="document-page-main-content-area">
          <div className="document-card-panel">
            <DocumentCard document={document} />
          </div>

          <div className="force-graph-panel">
            <ForceGraph
              nodeIds={nodeIds}
              settings={{
                collectionsToPrune: filteredPrunedCollections,
                defaultDepth: nodeIds.length > 1 ? 0 : 2,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;
