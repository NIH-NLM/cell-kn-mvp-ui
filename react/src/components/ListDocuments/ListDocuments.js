import React from "react";
import { Link } from "react-router-dom";
import * as Utils from "../Utils/Utils";

const ListDocuments = ({ document: document }) => {
  return (
    <Link to={`/browse/${document._id}`}>
      <div className="list-document">
        <h3>{Utils.getLabel(document)}</h3>
      </div>
    </Link>
  );
};

export default ListDocuments;
