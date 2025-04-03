import React, { useState } from "react";
import { Link } from "react-router-dom";
import * as Utils from "../Utils/Utils";

const SearchResultsTable = ({ searchResults, handleSelectItem }) => {
  // Get only the headers that have results
  const filteredHeaders = Object.keys(searchResults).filter(
    (key) => searchResults[key].length > 0,
  );

  // State for which headers are expanded
  const [expandedHeaders, setExpandedHeaders] = useState({});
  // State for how many items are currently shown per header
  const [displayLimits, setDisplayLimits] = useState({});

  const expandAmount = 50;

  // Toggle header expansion; when expanding, set initial display limit to expandAmount or the total if less.
  const toggleExpand = (header) => {
    setExpandedHeaders((prev) => {
      const newExpanded = { ...prev, [header]: !prev[header] };
      // When expanding, initialize the display limit
      if (newExpanded[header] && !displayLimits[header]) {
        setDisplayLimits((prevLimits) => ({
          ...prevLimits,
          [header]:
            searchResults[header].length > expandAmount
              ? expandAmount
              : searchResults[header].length,
        }));
      }
      return newExpanded;
    });
  };

  // Function to check if the user scrolled to the bottom
  const handleScroll = (e, header) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const threshold = 5;
    // User scrolled to bottom of list
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      // Increase the limit by expandAmount, up to the total number of results
      const currentLimit = displayLimits[header] || expandAmount;
      const newLimit = Math.min(
        currentLimit + expandAmount,
        searchResults[header].length,
      );
      if (newLimit > currentLimit) {
        setDisplayLimits((prevLimits) => ({
          ...prevLimits,
          [header]: newLimit,
        }));
      }
    }
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
            <span data-testid={`header-${header}`}>{header}</span>
            <span className="item-count">
              {" "}
              ({searchResults[header].length})
            </span>
          </h3>
          {expandedHeaders[header] && (
            <div
              className="result-list"
              onScroll={(e) => handleScroll(e, header)}
            >
              {searchResults[header]
                .slice(0, displayLimits[header] || expandAmount)
                .map((item, index) => (
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
