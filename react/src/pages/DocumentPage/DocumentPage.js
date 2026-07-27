import collectionDefaults from "assets/collection-defaults.json";
import GraphWorkspace from "components/GraphWorkspace";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchDocument } from "services";
import { initializeGraph } from "store";
import { parseId } from "utils";

const DocumentPage = () => {
  const dispatch = useDispatch();
  const { coll, id } = useParams();
  const [document, setDocument] = useState(null);
  const [nodeIds, setNodeIds] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const getDocumentData = async () => {
      try {
        const data = await fetchDocument(coll, id);
        if (cancelled) return;
        setDocument(data);
        setNodeIds(parseId(data));
        dispatch(initializeGraph({ nodeIds: parseId(data) }));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch document:", error);
          setDocument(null);
        }
      }
    };

    if (id && coll) {
      setDocument(null);
      getDocumentData();
    }
    return () => {
      cancelled = true;
    };
  }, [id, coll, dispatch]);

  const forceGraphSettings = useMemo(() => {
    // Use collection-specific defaults, falling back to _defaults for unknown collections
    const collectionConfig = collectionDefaults[coll] || collectionDefaults._defaults || {};

    // Start with the resolved defaults
    const base = { ...collectionConfig };

    // If multiple origin nodes, prefer shallower depth unless explicitly set in defaults
    if (nodeIds && nodeIds.length > 1 && typeof base.depth !== "number") {
      base.depth = 0;
    }

    // Always use phenotypes graph
    base.graphType = "phenotypes";

    return base;
  }, [coll, nodeIds]);

  const isLoading = !document && id && coll;

  if (isLoading) {
    return (
      <div className="content-page-layout">
        <div className="loading-message">Loading document details...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="content-page-layout">
        <div className="error-message">
          Document not found or failed to load. Please check the URL or try again.
        </div>
      </div>
    );
  }

  // Document is loaded
  return (
    <div className="content-page-layout document-details-page-layout">
      <div className="content-box document-details-content-box">
        <div className="document-item-header">
          {document.term && <span>Term: {document.term}</span>}{" "}
        </div>
        <div className="document-page-main-content-area">
          <GraphWorkspace
            originDocument={document}
            nodeIds={nodeIds}
            settings={forceGraphSettings}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;
