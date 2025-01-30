import React, {useState, useEffect, useContext} from "react";
import CellCard from "../components/CellCard";
import ForceGraph from "../components/ForceGraph";
import { PrunedCollections } from "../components/Contexts";

// Document as described in ArangoDB documentation
const DocumentPage = ({ match }) => {
  let documentId = match.params.id;
  let collection = match.params.coll;
  let [document, setDocument] = useState(null);

  // Modify the PrunedCollections context if this collection is part of that list
  const prunedCollections = useContext(PrunedCollections);
  const filteredPrunedCollections = prunedCollections.includes(collection)
    ? prunedCollections.filter(item => item !== collection)
    : prunedCollections;

  useEffect(() => {
    getDocument().then((r) => setDocument(r));
  }, [documentId, collection]);

  let getDocument = async () => {
    let response = await fetch(
      `/arango_api/collection/${collection}/${documentId}/`,
    );
    return response.json();
  };

//TODO: Move helper functions such as this to isolated helper function 'utils'? */
  function capitalCase(input) {
    if (Array.isArray(input)) {
      // If the input is an array, map over each element and capitalize each word
      return input.map(str =>
          typeof str === 'string'
              ? str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
              : str
      )
      .join('+');
    } else if (typeof input === 'string') {
      // If the input is a single string, capitalize each word
      return input.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    } else {
      // If the input is neither a string nor an array of strings, return as is
      return input;
    }
  }

  if (document) {
    return (
      <div className="document-card">
        <div className="document-item-header">
          <h1>{capitalCase(document.label ? document.label : document._id)}</h1>
          <span>{document.term}</span>
        </div>
        <div className="document-item-container">
          <CellCard cell={document} />
          <ForceGraph nodeIds={[document._id]} heightRatio={1} settings={{collectionsToPrune: filteredPrunedCollections}} />
        </div>
      </div>
    );
  } else {
    // TODO: Handle error
    return <div>Error</div>;
  }
};

export default DocumentPage;
