import { useEffect, useState } from 'react';
import BrowseBox from "../components/BrowseBox";
import ListCells from "../components/ListCells";
import {useParams} from "react-router-dom";

const CLList = ({ match, history }) => {
    const { coll } = useParams();
    const [clList, setClList] = useState([]);

    useEffect(() => {
        getClList();
        }, [coll]);

    const getClList = async () => {
        const response = await fetch(`/arango_api/collection/${coll}/`);
        const data = await response.json();
        sortClList(data);
    };

    const sortClList = (clList) => {
        const sortedList = Object.values(clList);
        sortedList.sort((a, b) => parseInt(a._key) - parseInt(b._key));
        setClList(sortedList);
    };

    return (
        <div>
            <BrowseBox currentCollection={coll} />
            <div className="page-container">
                <div className="cl-container">
                    <header className="cl-header">
                        <p className="cl-count">{clList.length} results</p>
                    </header>
                    <div className="cl-list">
                        {clList.map((cell, index) => (
                            <ListCells key={index} cell={cell} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CLList;
