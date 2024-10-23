import {useEffect, useState} from "react";
import {Link} from "react-router-dom";

const SearchPage = ({ match, history }) => {

    // TODO: set initial search?
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([])

    useEffect(() => {
        getSearchTerms(searchTerm).then(data => {
                console.log(data)
                setSearchResults(data)
            });
    }, [searchTerm]);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
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
        <div className="search-bar-container">
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={handleSearch}
                />
                <ul className="search-results-list">
                    {searchResults.map((item) => (
                        <Link to={item._id}>
                            <li className="search-results-list-item">{item.label ? item.label : item.term}</li>
                        </Link>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default SearchPage
