import { Link } from "react-router-dom";
import { getLabel, getUrl } from "../Utils/Utils";

const SelectedItemsTable = ({
  selectedItems,
  generateGraph,
  removeSelectedItem,
}) => {
  function handleGenerateGraph() {
    generateGraph(selectedItems);
  }

  function handleRemoveItem(item) {
    removeSelectedItem(item);
  }

  // Helper to make URLs more readable if they are very long
  const formatUrlForDisplay = (url) => {
    if (!url) return "";
    try {
      const parsedUrl = new URL(url);
      let displayUrl =
        parsedUrl.hostname +
        (parsedUrl.pathname === "/" ? "" : parsedUrl.pathname);
      if (displayUrl.length > 40) {
        // Truncate if too long
        return displayUrl.substring(0, 37) + "...";
      }
      return displayUrl;
    } catch (e) {
      return url.length > 40 ? url.substring(0, 37) + "..." : url;
    }
  };

  return (
    selectedItems.length > 0 && (
      <fieldset className="selected-items-container">
        <legend className="selected-items-legend">Origin Nodes</legend>
        <table className="selected-items-table">
          <thead>
            <tr>
              <th className="th-label">Label</th>
              <th className="th-source">Source</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((item, index) => (
              <tr key={item._id || index} className="selected-item-row">
                <td data-label="Label">{getLabel(item)}</td>
                <td data-label="Source">
                  <a
                    href={getUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-source-link"
                  >
                    {formatUrlForDisplay(getUrl(item))}
                  </a>
                </td>
                <td data-label="Actions" className="selected-item-actions-cell">
                  <button
                    onClick={() => handleRemoveItem(item)}
                    className="action-button remove-button"
                    aria-label={`Remove ${getLabel(item)}`}
                  >
                    Remove
                  </button>
                  <Link
                    to={`/collections/${item._id}`}
                    target="_blank"
                    className="action-button view-button"
                    aria-label={`View details for ${getLabel(item)}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="generate-graph-action-area">
          <button
            onClick={handleGenerateGraph}
            className="primary-action-button generate-graph-button"
          >
            Generate Graph
          </button>
        </div>
      </fieldset>
    )
  );
};

export default SelectedItemsTable;
