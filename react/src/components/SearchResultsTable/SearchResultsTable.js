import React, { useState } from "react";
import { Link } from "react-router-dom";
import * as Utils from "../Utils/Utils";

const SearchResultsTable = ({
  searchResults,
  handleSelectItem,
  handleScroll,
}) => {
  // Get only the headers that have results
  const filteredHeaders = Object.keys(searchResults).filter(
    (key) => searchResults[key].length > 0,
  );

  // Use state to track which headers are expanded
  const [expandedHeaders, setExpandedHeaders] = useState({});

  const toggleExpand = (header) => {
    setExpandedHeaders((prev) => ({
      ...prev,
      [header]: !prev[header],
    }));
  };

  return (
    <div className="search-results-wrapper">
      {filteredHeaders.map((header) => (
        <div className="result-list-column" key={header}>
          <h3
            className="result-list-header"
            onClick={() => toggleExpand(header)}
          >
            <span className="arrow-icon">
              {expandedHeaders[header] ? "▼ " : "▶ "}
            </span>
            {header} ({searchResults[header].length})
          </h3>
          {expandedHeaders[header] && (
            <div className="result-list" onScroll={handleScroll}>
              {searchResults[header].map((item, index) => (
                <div key={index} className="result-list-item">
                  <Link
                    to={`/browse/${item._id}`}
                    target="_blank"
                    className="item-link"
                  >
                    {Utils.getLabel(item)}
                  </Link>
                  <span
                    className="plus-icon"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent the Link from triggering
                      handleSelectItem(item);
                    }}
                  >
                    +
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SearchResultsTable;
