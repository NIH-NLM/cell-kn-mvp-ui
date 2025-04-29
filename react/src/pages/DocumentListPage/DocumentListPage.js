import { useContext, useEffect, useState } from "react";
import BrowseBox from "../../components/BrowseBox/BrowseBox";
import ListDocuments from "../../components/ListDocuments/ListDocuments";
import { useParams } from "react-router-dom";
import Pagination from "../../components/Pagination/Pagination";
import { getLabel } from "../../components/Utils/Utils";

const DocumentListPage = () => {
  // -- Contexts --
  // const { graphType, setGraphType } = useContext(GraphContext);
  // Ignore context for focused queries
  const graphType = "phenotypes"
  const { coll } = useParams();
  const [documentList, setDocumentList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState("");
  const itemsPerPage = 100;

  useEffect(() => {
    // Reset page and clear filter when collection changes
    setCurrentPage(1);
    setFilterText("");
    getDocumentList(graphType);
  }, [coll, graphType]);

  const getDocumentList = async (graphType) => {
    const response = await fetch(`/arango_api/collection/${coll}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        graph: graphType,
      }),
    });
    const data = await response.json();
    sortDocumentList(data);
  };

  const sortDocumentList = (documents) => {
    const sortedList = Object.values(documents);
    // Separate items that have a label and those that do not
    const labeledItems = sortedList.filter((item) => getLabel(item));
    const keyItems = sortedList.filter((item) => !getLabel(item));

    // Sort labeled items alphabetically by label, handling arrays
    labeledItems.sort((a, b) => {
      const labelA = Array.isArray(getLabel(a)) ? getLabel(a)[0] : getLabel(a);
      const labelB = Array.isArray(getLabel(b)) ? getLabel(b)[0] : getLabel(b);
      return labelA.localeCompare(labelB);
    });

    // Sort items with _key numerically
    keyItems.sort((a, b) => parseInt(a._key) - parseInt(b._key));

    // Combine lists and update state
    setDocumentList([...labeledItems, ...keyItems]);
  };

  // First, filter documents based on the filterText
  const filteredDocuments = documentList.filter((doc) => {
    const searchLower = filterText.toLowerCase();
    const label =
      doc.label && Array.isArray(doc.label) ? doc.label[0] : doc.label || "";
    const key = doc._key ? doc._key.toString() : "";
    return (
      label.toLowerCase().includes(searchLower) ||
      key.toLowerCase().includes(searchLower)
    );
  });

  // If filterText is not empty, sort the filtered documents to bring exact matches to the top.
  const sortedFilteredDocuments =
    filterText.trim() !== ""
      ? [...filteredDocuments].sort((a, b) => {
          const searchLower = filterText.toLowerCase();

          // Get document fields in lower case. If label is an array, use the first element
          const labelA = (
            a.label && Array.isArray(a.label) ? a.label[0] : a.label || ""
          ).toLowerCase();
          const keyA = a._key ? a._key.toString().toLowerCase() : "";
          const labelB = (
            b.label && Array.isArray(b.label) ? b.label[0] : b.label || ""
          ).toLowerCase();
          const keyB = b._key ? b._key.toString().toLowerCase() : "";

          const scoreA = labelA === searchLower || keyA === searchLower ? 0 : 1;
          const scoreB = labelB === searchLower || keyB === searchLower ? 0 : 1;

          // Documents with score 0 (exact match) will sort to the top
          return scoreA - scoreB;
        })
      : filteredDocuments;

  // Change page if user types a new filter, so you always start at page 1
  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
    setCurrentPage(1);
  };

  // Calculate indices for current page based on sorted and filtered results
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedFilteredDocuments.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  // Change page function
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate total pages
  const totalPages = Math.ceil(sortedFilteredDocuments.length / itemsPerPage);

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
            <input
              type="text"
              placeholder="Filter documents..."
              value={filterText}
              onChange={handleFilterChange}
            />
            <p className="document-count">
              {sortedFilteredDocuments.length} results
            </p>
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
