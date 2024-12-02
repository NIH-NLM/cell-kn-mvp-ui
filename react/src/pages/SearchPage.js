import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ForceGraph from "../components/ForceGraph";

const SearchPage = () => {
    const debounceTimeoutRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [input, setInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false); // Track loading state for fetching more results
    const [resultsLoaded, setResultsLoaded] = useState(100); // Initially load 100 results
    const [selectedItems, setSelectedItems] = useState([]); // Track selected items
    const [nodeIds, setNodeIds] = useState([]); // nodeIds will be used in the graph, separate from currently selected items
    const [error, setError] = useState(null); // For displaying potential errors

    // Fetch search terms from the API with pagination
    const getSearchTerms = async (searchTerm, limit = 100) => {
        let response = await fetch(`/arango_api/search/${searchTerm}?limit=${limit}`);
        return response.json();
    };

    useEffect(() => {
        const fetchSearchResults = async () => {
            setLoading(true);
            const data = await getSearchTerms(searchTerm, resultsLoaded);
            data.sort((a, b) => {
                return (a.label && b.label)
                    ? a.label.toString().toLowerCase().localeCompare(b.label.toString().toLowerCase())
                    : a._id.split('/')[1].toLowerCase().localeCompare(b._id.split('/')[1].toLowerCase());
            });
            setSearchResults(data);
            setLoading(false);
        };

        if (searchTerm !== "") {
            fetchSearchResults();
        } else {
            // TODO: Set default value?
            setSearchResults([]);
        }
    }, [searchTerm, resultsLoaded]); // Trigger search on searchTerm or resultsLoaded change

    const handleSearch = (event) => {
        const value = event.target.value;
        setInput(value);

        // Clear the previous timeout to reset the debounce
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Set a new timeout to delay the search by 150ms (to prevent excessive API calls)
        debounceTimeoutRef.current = setTimeout(() => {
            setSearchTerm(value);
            setShowResults(true);
        }, 150);
    };

    const handleFocus = () => {
        setShowResults(true);
    };

    const handleBlur = () => {
        // Timeout smooths transition
        setTimeout(() => {
            setShowResults(false);
        }, 100);
    };

    // Infinite scroll handler: Detect when the user scrolls to the bottom of the list
    const handleScroll = (event) => {
        const bottom = event.target.scrollHeight === event.target.scrollTop + event.target.clientHeight;
        if (bottom && !loading) {
            setResultsLoaded(prev => prev + 100); // Load the next 100 results
        }
    };

    // Add selected item to the list
    const handleSelectItem = (item) => {
        setSelectedItems(prev => [...prev, item]);
        // Optional: Close the dropdown after selection
        setShowResults(false);
        setInput('');
    };

    // Update nodeIds to generate graph
    const generateGraph = () => {
        setNodeIds(selectedItems.map((item) => item._id));
    };

    return (
        <div className="search-container">
            {selectedItems.length > 0 && (
                <>
                    <ul>
                        {selectedItems.map((item, index) => (
                            <li key={index}>{item.label}</li>
                        ))}
                    </ul>
                    <div className="generate-graph-button">
                        <button onClick={generateGraph}>Generate Graph</button>
                    </div>
                </>
            )}
            <div className="search-bar-container"
                 // TODO: fix position of search on screen - perhaps left and right for sunburst and search?
                style={showResults && searchResults.length > 0 ? { margin: 0 } : { margin: "0 0 50vh 0" }}>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={input}
                        onChange={handleSearch}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </div>
            </div>
            <div
                className="search-results-container"
                style={showResults ? { display: "flex" } : { display: "none" }}
                onScroll={handleScroll} // Attach scroll event listener
            >
                <div>
                    <ul className="search-results-list">
                        {searchResults.map((item, index) => (
                            <li
                                key={index}
                                className="list-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelectItem(item)}
                            >
                                {item.label ? item.label : item.term}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="graph-container">
                {Object.keys(nodeIds).length > 0 ? (
                    <ForceGraph nodeIds={nodeIds} defaultDepth={2} />
                ) : (
                    <div>{error}</div>
                )}
            </div>

        </div>
    );
};

export default SearchPage;
