import {useEffect, useState} from "react";
import {Link} from "react-router-dom";

const SearchPage = ({ match, history }) => {

    // TODO: seed initial search?
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([])
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        getSearchTerms(searchTerm).then(data => {
            data.sort(function (a, b) {
                // Sort by labels if possible, else _id
                // TODO: fix errors
                return (a.label && b.label)
                    ? a.label.toLowerCase().localeCompare(b.label.toLowerCase())
                    : a._id.toLowerCase().localeCompare(b._id.toLowerCase());
            });
                setSearchResults(data)
            });
    }, [searchTerm]);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
        setShowResults(true); // Show results while typing
    };

    const handleFocus = () => {
        setShowResults(true); // Show results on focus
    };

    const handleBlur = () => {
        // Timeout smooths transition
        setTimeout(() => {
            setShowResults(false);
        }, 100);
    };

    let getSearchTerms = async (searchTerm) => {
        if (searchTerm != ""){
            let response = await fetch(`/arango_api/search/${searchTerm}`)
            return response.json()
        } else {
            let response = await fetch(`/arango_api/get_all`)
            return response.json()
        }
    }

    return(
        <div className="search-container">
            <div className="search-bar-container">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={handleSearch}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                </div>
            </div>
            <div className="search-results-container" style={showResults ? {display:"flex"} : {display:"none"}}>
                <div>
                    <ul className="search-results-list">
                        {searchResults.map((item) => (
                            <Link to={item._id} onMouseDown={(e) => e.preventDefault()}>
                                <li className="search-results-list-item">{item.label ? item.label : item.term}</li>
                            </Link>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default SearchPage
