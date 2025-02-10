import { useEffect, useState } from "react";
import BrowseBox from "../../components/BrowseBox/BrowseBox";
import ListDocuments from "../../components/ListDocuments/ListDocuments";
import { useParams } from "react-router-dom";

const DocumentListPage = () => {
  const { coll } = useParams();
  const [documentList, setDocumentList] = useState([]);

  useEffect(() => {
    getDocumentList();
  }, [coll]);

  const getDocumentList = async () => {
    const response = await fetch(`/arango_api/collection/${coll}/`);
    const data = await response.json();
    sortDocumentList(data);
  };

  const sortDocumentList = (documentList) => {
    const sortedList = Object.values(documentList);
    // Separate items that have a label and those that don't
    const labeledItems = sortedList.filter(item => item.label);
    const keyItems = sortedList.filter(item => !item.label && item._key);

    // Sort labeled items alphabetically by label, handling arrays
    labeledItems.sort((a, b) => {
      // Get label, use first instance if array, such as in biomarker_combination
      const labelA = Array.isArray(a.label) ? a.label[0] : a.label;
      const labelB = Array.isArray(b.label) ? b.label[0] : b.label;

      return labelA.localeCompare(labelB);
    });

    // Sort items with _key numerically
    keyItems.sort((a, b) => parseInt(a._key) - parseInt(b._key));

    // Combine lists
    const finalList = [...labeledItems, ...keyItems];

    // Update the state with the sorted list
    setDocumentList(finalList);
  };

  return (
    <div>
      <BrowseBox currentCollection={coll} />
      <div className="page-container">
        <div className="document-container">
          <header className="document-header">
            <p className="document-count">{documentList.length} results</p>
          </header>
          <div className="document-list">
            {documentList.map((document, index) => (
              <ListDocuments key={index} document={document} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentListPage;
