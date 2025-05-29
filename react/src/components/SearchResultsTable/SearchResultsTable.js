import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import collectionsMapData from "../../assets/collectionsMap.json";
import { getLabel } from "../Utils/Utils";
import {getColorForCollection} from "../../services/ColorServices/ColorServices";

const SearchResultsTable = ({ searchResults, handleSelectItem }) => {
  const collectionsMap = useMemo(() => new Map(collectionsMapData), []);
  const expandAmount = 20;

  const flatResults = useMemo(() => {
    if (!searchResults || Object.keys(searchResults).length === 0) {
      return [];
    }
    return Object.entries(searchResults).flatMap(([header, items]) =>
      items.map((item) => ({
        ...item,
        collectionKey: header, // The 'header' is the collectionId
        collectionDisplayName:
          collectionsMap.get(header)?.display_name || header,
      })),
    );
  }, [searchResults, collectionsMap]);

  const [displayLimit, setDisplayLimit] = useState(expandAmount);

  useEffect(() => {
    setDisplayLimit(expandAmount);
  }, [searchResults]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const threshold = 10;
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      if (displayLimit < flatResults.length) {
        const newLimit = Math.min(
          displayLimit + expandAmount,
          flatResults.length,
        );
        setDisplayLimit(newLimit);
      }
    }
  };

  if (flatResults.length === 0) {
    return <div className="no-results-message">No results found.</div>;
  }

  return (
    <div className="unified-search-results-list" onScroll={handleScroll}>
      {flatResults.slice(0, displayLimit).map((item, index) => {
        // Get the color for the current item's collection
        const tagBackgroundColor = getColorForCollection(item.collectionKey);

        // Determine text color for contrast
        const isDarkBackground = (color) => {
          if (!color) return false;
          // parse the color  and calculate luminance.
          const hex = color.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
        };

        const tagTextColor = isDarkBackground(tagBackgroundColor)
          ? "var(--color-text-on-dark, #ffffff)"
          : "var(--color-text, #212121)";

return (
          <div key={item._id || index} className="result-item-row">
            <Link
              to={`/collections/${item._id}`}
              target="_blank"
              className="item-main-link"
            >
              {getLabel(item)}
            </Link>
            <Link
              to={`/collections/${item.collectionKey}`}
              target="_blank" // Open in new tab
              className="item-collection-tag"
              style={{
                backgroundColor: tagBackgroundColor,
                color: tagTextColor,
                textDecoration: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {item.collectionDisplayName}
            </Link>
            <button
              type="button"
              className="item-add-button"
              onClick={() => handleSelectItem(item)}
              aria-label={`Add ${getLabel(item)} to selection`}
            >
              +
            </button>
          </div>
        );
      })}
      {displayLimit < flatResults.length && (
        <div className="loading-more-results">Loading more...</div>
      )}
    </div>
  );
};

export default SearchResultsTable;