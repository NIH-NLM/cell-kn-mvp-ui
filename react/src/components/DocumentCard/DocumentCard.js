import React from "react";
import { getUrl } from "../Utils/Utils";

const DocumentCard = ({ document }) => {
  const url = getUrl(document);
  const content = document._id.replace("/", "_");

  return (
    <div className="document-item-list-wrapper">
      {" "}
      <fieldset className="document-info-fieldset">
        {" "}
        <legend className="document-info-legend">
          {/* Render as <a> only if url exists */}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={"external-link document-id-link"}
            >
              {content}
            </a>
          ) : (
            <span>{content}</span>
          )}
        </legend>
        <table className="document-attributes-table">
          {" "}
          <tbody>
            {" "}
            {Object.entries(document).map(([key, value]) => {
              if (
                !key.startsWith("_") &&
                key !== "term" &&
                key !== "label" &&
                key !== "Name" &&
                key !== "Symbol"
              ) {
                return (
                  <tr key={key}>
                    {" "}
                    <td className="attribute-key wrap">{key}</td>
                    <td className="attribute-value wrap">
                      {typeof value === "boolean"
                        ? value.toString()
                        : Array.isArray(value)
                          ? value.join(", ")
                          : value !== null && typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : value}
                    </td>
                  </tr>
                );
              } else {
                return null;
              }
            })}
          </tbody>
        </table>
      </fieldset>
    </div>
  );
};

export default DocumentCard;
