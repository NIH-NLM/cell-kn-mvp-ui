import React from "react";

/* TODO: Rename */
const CellCard = ({ cell: cell }) => {
  return (
    <div className="cell-item-list">
      <fieldset>
        <legend>
          {Array.isArray(cell.label) ? cell.label.join("+") : cell.label}
        </legend>
        <table>
          {Object.entries(cell).map(([key, value]) => {
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

export default CellCard;
