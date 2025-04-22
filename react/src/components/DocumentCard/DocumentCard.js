import React from "react";
import { getUrl } from "../Utils/Utils";

const DocumentCard = ({ document: document }) => {
  return (
    <div className="document-item-list">
      <fieldset>
        <legend>
          <a
            href={getUrl(document)}
            target={"blank"}
            className={"external-link"}
          >
            {document._id.replace("/", "_")}
          </a>
        </legend>
        <table>
          {Object.entries(document).map(([key, value]) => {
            if (!key.startsWith("_")) {
              return (
                <tr>
                  <td className="nowrap">{key}</td>
                  <td>{Array.isArray(value) ? value.join(", ") : value}</td>
                </tr>
              );
            } else {
              return null;
            }
          })}
        </table>
      </fieldset>
    </div>
  );
};

export default DocumentCard;
