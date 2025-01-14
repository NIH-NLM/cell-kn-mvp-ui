import {Link} from "react-router-dom";
import {useEffect, useState} from "react";
import {fetchCollections, parseCollections} from "./Utils";

const BrowseBox = ({ currentCollection }) => {

    const [collections, setCollections] = useState([]);

    useEffect(() => {

        fetchCollections().then(data => {
            // Set collections state
            setCollections(parseCollections(data))
        } );
    }, []);


    return (
        <div className="browse-box">
            <ul>
                {collections.map((coll) => (
                    <li key={coll}>
                        <Link
                            to={`/browse/${coll}`}
                            className={coll === currentCollection ? "active" : ""}
                        >
                            <h3>{coll}</h3>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BrowseBox;


