import { useEffect, useRef, useState } from "react";
import SelectedItemsTable from "../SelectedItemsTable/SelectedItemsTable";
import SearchResultsTable from "../SearchResultsTable/SearchResultsTable";

const SearchBar = ({
  generateGraph,
  selectedItems,
  removeSelectedItem,
  addSelectedItem,
}) => {
  const containerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const getSearchTerms = async (searchTerm, limit = 100) => {
    let response = await fetch(
      `/arango_api/search/${searchTerm}?limit=${limit}`
    );
    return response.json();
  };

  useEffect(() => {
    const fetchSearchResults = async () => {
      const data = await getSearchTerms(searchTerm);
      setSearchResults(data);
    };

    if (searchTerm !== "") {
      fetchSearchResults();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setInput(value);

    // Clear the previous timeout to reset the debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Delay the search to prevent excessive API calls
    debounceTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setShowResults(true);
    }, 250);
  };

  const showR = () => {
    setShowResults(true);
  };

  function handleSelectItem(item) {
    addSelectedItem(item);
    setShowResults(false);
    setInput("");
  }

  // Add listeners for clicking outside of search area
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-bar-container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search..."
            value={input}
            onChange={handleSearch}
            onMouseEnter={showR}
          />
        </div>
        <div
          className={`search-results-container ${showResults ? "show" : ""}`}
        >
          <SearchResultsTable
            searchResults={searchResults}
            handleSelectItem={handleSelectItem}
          />
        </div>
      </div>
      <SelectedItemsTable
        selectedItems={selectedItems}
        generateGraph={generateGraph}
        removeSelectedItem={removeSelectedItem}
      />
    </div>
  );
};

export default SearchBar;
