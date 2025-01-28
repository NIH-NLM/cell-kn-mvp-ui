import { useEffect, useState } from "react";
import BrowseBox from "../components/BrowseBox";
import ListCells from "../components/ListCells";
import { useParams } from "react-router-dom";

/* TODO: Remove unneeded match, history props */
/* TODO: Rename */
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
    // Separate items that have a label and those that don't
    const labeledItems = sortedList.filter(item => item.label);
    const keyItems = sortedList.filter(item => !item.label && item._key);

    // Sort labeled items alphabetically by label
    labeledItems.sort((a, b) => a.label.localeCompare(b.label));
    // Sort items with _key numerically
    keyItems.sort((a, b) => parseInt(a._key) - parseInt(b._key));

    // Combine lists
    const finalList = [...labeledItems, ...keyItems];

    // Update the state with the sorted list
    setClList(finalList);
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
