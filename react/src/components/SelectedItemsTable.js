import {Link} from "react-router-dom";

const SelectedItemsTable = ({ selectedItems, generateGraph, removeSelectedItem }) => {

    function handleGenerateGraph() {
        generateGraph(selectedItems)
    }

    function handleRemoveItem(item) {
        removeSelectedItem(item)
    }

    return(
        selectedItems.length > 0 && (
            <div>
                <table className="selected-items-table">
                    <thead>
                    <tr>
                        <th>Identifier</th>
                        <th>Label</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {selectedItems.map((item, index) => (
                        <tr key={item._id || index}>
                            <td>{item.term || item._id}</td>
                            <td>{item.label}</td>
                            <td className="selected-items-table-actions">
                                <button onClick={() => handleRemoveItem(item)}>
                                    Remove
                                </button>
                                <Link to={item._id} target="_blank">
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
            </div>
        )
    )
}

export default SelectedItemsTable