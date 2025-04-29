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

  return (
    selectedItems.length > 0 && (
      <fieldset>
        <legend>Origin Nodes</legend>
        <table className="selected-items-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((item, index) => (
              <tr key={item._id || index}>
                <td>{getLabel(item)}</td>
                <td>
                  <a
                    href={getUrl(item)}
                    target={"blank"}
                    className={"external-link"}
                  >
                    {getUrl(item)}
                  </a>
                </td>
                <td className="selected-items-table-actions">
                  <button onClick={() => handleRemoveItem(item)}>Remove</button>
                  <Link to={`/browse/${item._id}`} target="_blank">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="generate-graph-button">
          <button onClick={handleGenerateGraph}>Generate Graph</button>
        </div>
      </fieldset>
    )
  );
};

export default SelectedItemsTable;
