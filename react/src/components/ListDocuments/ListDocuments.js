import React from "react";
import { Link } from "react-router-dom";

/* TODO: Sort from utils */
let getLabel = (document) => {
  let label = "";
  if (document.label) {
    label = Array.isArray(document.label)
      ? document.label.join("+")
      : document.label;
  } else if (document.term) {
    label = Array.isArray(document.term)
      ? document.term.join("+")
      : document.term;
  } else {
    label = document._id;
  }
  return label;
};

const ListDocuments = ({ document: document }) => {
  return (
    <Link to={`/browse/${document._id}`}>
      <div className="list-document">
        <h3>{getLabel(document)}</h3>
      </div>
    </Link>
  );
};

export default ListDocuments;
