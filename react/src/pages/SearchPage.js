import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const SearchPage = () => {
    const debounceTimeoutRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [input, setInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false); // Track loading state for fetching more results

    // Track the number of results to load
    const [resultsLoaded, setResultsLoaded] = useState(100); // Initially load 100 results

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

    return (
        <div className="search-container">
            <div className="search-bar-container">
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
                            <Link key={index} to={item._id} onMouseDown={(e) => e.preventDefault()}>
                                <li className="search-results-list-item">
                                    {item.label ? item.label : item.term}
                                </li>
                            </Link>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SearchPage;
