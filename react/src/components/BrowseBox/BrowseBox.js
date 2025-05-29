import { Link, useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { fetchCollections, parseCollections, getLabel } from "../Utils/Utils";
import collectionsMapData from "../../assets/collectionsMap.json";
import ListDocuments from "../ListDocuments/ListDocuments";
import Pagination from "../Pagination/Pagination";

const collectionsMap = new Map(collectionsMapData);

const BrowseBox = () => {
  const { coll: currentCollectionFromUrl } = useParams();
  const currentCollection = currentCollectionFromUrl;

  // -- Contexts --
  // const { graphType, setGraphType } = useContext(GraphContext);
  const graphType = "phenotypes";

  // State for collections list
  const [collections, setCollections] = useState([]);

  // State for document list of the current collection
  const [documentList, setDocumentList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState("");
  const itemsPerPage = 100;

  // Fetch collections list
  useEffect(() => {
    setCollections([]); // Clear old collections
    fetchCollections(graphType).then((data) => {
      setCollections(parseCollections(data, collectionsMap));
    });
  }, [graphType]);

  // Memoized function for sorting
  const sortDocumentList = useCallback((documents) => {
    const sortedList = Object.values(documents);
    const labeledItems = sortedList.filter((item) => getLabel(item));
    const keyItems = sortedList.filter((item) => !getLabel(item));

    labeledItems.sort((a, b) => {
      const labelA = Array.isArray(getLabel(a)) ? getLabel(a)[0] : getLabel(a);
      const labelB = Array.isArray(getLabel(b)) ? getLabel(b)[0] : getLabel(b);
      return labelA.localeCompare(labelB);
    });
    keyItems.sort((a, b) => parseInt(a._key) - parseInt(b._key));
    setDocumentList([...labeledItems, ...keyItems]);
  }, []);

  // Fetch document list for the currentCollection
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!currentCollection) {
        setDocumentList([]);
        return;
      }
      try {
        const response = await fetch(
          `/arango_api/collection/${currentCollection}/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ graph: graphType }),
          },
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        sortDocumentList(data);
      } catch (error) {
        console.error("Failed to fetch document list:", error);
        setDocumentList([]);
      }
    };

    setCurrentPage(1); // Reset page when collection changes
    setFilterText(""); // Clear filter when collection changes
    fetchDocuments();
  }, [currentCollection, graphType, sortDocumentList]);

  // Filtering logic
  const filteredDocuments = documentList.filter((doc) => {
    const searchLower = filterText.toLowerCase();
    const label = (
      doc.label && Array.isArray(doc.label) ? doc.label[0] : doc.label || ""
    ).toLowerCase();
    const key = (doc._key ? doc._key.toString() : "").toLowerCase();
    return label.includes(searchLower) || key.includes(searchLower);
  });

  const sortedFilteredDocuments =
    filterText.trim() !== ""
      ? [...filteredDocuments].sort((a, b) => {
          const searchLower = filterText.toLowerCase();
          const labelA = (
            a.label && Array.isArray(a.label) ? a.label[0] : a.label || ""
          ).toLowerCase();
          const keyA = (a._key ? a._key.toString() : "").toLowerCase();
          const labelB = (
            b.label && Array.isArray(b.label) ? b.label[0] : b.label || ""
          ).toLowerCase();
          const keyB = (b._key ? b._key.toString() : "").toLowerCase();
          const scoreA = labelA === searchLower || keyA === searchLower ? 0 : 1;
          const scoreB = labelB === searchLower || keyB === searchLower ? 0 : 1;
          return scoreA - scoreB;
        })
      : filteredDocuments;

  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
    setCurrentPage(1);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItemsToDisplay = sortedFilteredDocuments.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(sortedFilteredDocuments.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="browse-box-component-wrapper">
      <div className="browse-box-description">
        <h2 className="browse-box-title">Explore Data Collections</h2>
        <p>Select a collection from the list below to view its members.</p>
        <p>
          Once a collection is selected, you can filter its members further.
        </p>
      </div>

      <div className="browse-box-content">
        {/* Left Panel: Collections List */}
        <div className="collections-list-panel">
          {collections.length === 0 ? (
            <p className="loading-collections-message">
              Loading collections...
            </p>
          ) : (
            <ul className="collections-list">
              {collections.map((collKey) => {
                const collectionInfo = collectionsMap.get(collKey);
                const displayName = collectionInfo?.display_name || collKey;
                const abbreviatedName =
                  collectionInfo?.abbreviated_name || collKey;
                const moreInfo =
                  collectionInfo?.more_info || `More about ${displayName}`;
                return (
                  <li key={collKey} className="collection-list-item">
                    <Link
                      to={`/collections/${collKey}`}
                      className={`collection-link ${collKey === currentCollection ? "active" : ""}`}
                      title={moreInfo}
                    >
                      <h3 className="collection-name">{displayName}</h3>
                      <span className="collection-abbreviation">
                        ({abbreviatedName})
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right Panel: Document List for Selected Collection */}
        <div className="document-list-panel">
          {currentCollection ? (
            <>
              <header className="document-list-header">
                <input
                  type="text"
                  className="document-filter-input"
                  placeholder={`Filter items in ${collectionsMap.get(currentCollection)?.display_name || currentCollection}...`}
                  value={filterText}
                  onChange={handleFilterChange}
                />
                <p className="document-count">
                  {sortedFilteredDocuments.length} results
                </p>
              </header>
              {currentItemsToDisplay.length > 0 ? (
                <div className="document-list-items-container">
                  {currentItemsToDisplay.map((document, index) => (
                    <ListDocuments
                      key={document._id || index}
                      document={document}
                    />
                  ))}
                </div>
              ) : (
                <p className="no-documents-message">
                  {filterText
                    ? "No matching documents found for your filter."
                    : "No documents in this collection, or still loading."}
                </p>
              )}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  paginate={paginate}
                />
              )}
            </>
          ) : (
            <p className="select-collection-prompt">
              Please select a collection from the list to view its contents.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseBox;
