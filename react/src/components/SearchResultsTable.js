import React from 'react';

const SearchResultsTable = ({ searchResults, handleSelectItem }) => {
    // Filter out keys that have no items in their arrays
    const filteredHeaders = Object.keys(searchResults).filter(key => searchResults[key].length > 0);

    // Function to split headers into groups of 3
    const splitHeadersIntoChunks = (arr, chunkSize) => {
        const result = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            result.push(arr.slice(i, i + chunkSize));
        }
        return result;
    };

    // Split filtered headers into groups of 3
    const headerChunks = splitHeadersIntoChunks(filteredHeaders, 3);

    // Helper function to create a table cell
    const createTableCell = (key, rowIndex) => {
        // Check if the rowIndex is within the bounds of the list for this key
        return searchResults[key] && searchResults[key][rowIndex] ? (
            <td key={rowIndex} onClick={() => handleSelectItem(searchResults[key][rowIndex])} onMouseDown={(e) => e.preventDefault()}>
                {searchResults[key][rowIndex].label ? searchResults[key][rowIndex].label : searchResults[key][rowIndex].term}
            </td>
        ) : (
            <td key={rowIndex}></td> // Empty cell if no item exists
        );
    };

    return (
        <div>
            {/* Render each table chunk */}
            {headerChunks.map((headerGroup, chunkIndex) => (
                <table className="search-results-table" key={chunkIndex}>
                    <thead>
                        <tr>
                            {headerGroup.map((header) => (
                                <th key={header}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Create rows dynamically based on the number of items in the longest list */}
                        {Array.from({ length: Math.max(...headerGroup.map(key => searchResults[key].length)) }).map((_, rowIndex) => (
                            <tr key={rowIndex}>
                                {headerGroup.map((key) => createTableCell(key, rowIndex))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ))}
        </div>
    );
};

export default SearchResultsTable;
