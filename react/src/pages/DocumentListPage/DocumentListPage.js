import { useEffect, useState } from "react";
import BrowseBox from "../../components/BrowseBox/BrowseBox";
import ListDocuments from "../../components/ListDocuments/ListDocuments";
import { useParams } from "react-router-dom";
import Pagination from "../../components/Pagination/Pagination";

const DocumentListPage = () => {
  const { coll } = useParams();
  const [documentList, setDocumentList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    // Reset page when collection changes
    setCurrentPage(1);
    getDocumentList();
  }, [coll]);

  const getDocumentList = async () => {
    const response = await fetch(`/arango_api/collection/${coll}/`);
    const data = await response.json();
    sortDocumentList(data);
  };

  const sortDocumentList = (documents) => {
    const sortedList = Object.values(documents);
    // Separate items that have a label and those that do not
    const labeledItems = sortedList.filter((item) => item.label);
    const keyItems = sortedList.filter((item) => !item.label && item._key);

    // Sort labeled items alphabetically by label, handling arrays
    labeledItems.sort((a, b) => {
      const labelA = Array.isArray(a.label) ? a.label[0] : a.label;
      const labelB = Array.isArray(b.label) ? b.label[0] : b.label;
      return labelA.localeCompare(labelB);
    });

    // Sort items with _key numerically
    keyItems.sort((a, b) => parseInt(a._key) - parseInt(b._key));

    // Combine lists and update state
    setDocumentList([...labeledItems, ...keyItems]);
  };

  // Calculate indices for current page
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = documentList.slice(indexOfFirstItem, indexOfLastItem);

  // Change page function
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate total pages
  const totalPages = Math.ceil(documentList.length / itemsPerPage);

  return (
    <div>
      <BrowseBox currentCollection={coll} />
      <div className="page-container">
        <div className="document-container">
          <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              paginate={paginate}
          />
          <header className="document-header">
            <p className="document-count">{documentList.length} results</p>
          </header>
          <div className="document-list">
            {currentItems.map((document, index) => (
              <ListDocuments key={index} document={document} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentListPage;
