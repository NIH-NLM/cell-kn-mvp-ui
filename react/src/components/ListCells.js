import React from "react";
import { Link } from "react-router-dom";

/* TODO: Sort from utils */
let getLabel = (cell) => {
  let label = "";
  if (cell.label) {
    label = Array.isArray(cell.label) ? cell.label.join("+") : cell.label;
  } else if (cell.term) {
    label = Array.isArray(cell.term) ? cell.term.join("+") : cell.term;
  } else {
    label = cell._id;
  }
  return label;
};

/* TODO: Rename from ListCells */
const ListCells = ({ cell: cell }) => {
  return (
    <Link to={cell._id}>
      <div className="list-cell">
        <h3>{getLabel(cell)}</h3>
      </div>
    </Link>
  );
};

export default ListCells;
