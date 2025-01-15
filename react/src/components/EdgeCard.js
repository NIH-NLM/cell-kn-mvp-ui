import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* TODO: Remove edge card if there is no case for displaying edges specifically. Currently unused */
const EdgeLink = ({ edge: edge, node: node, isFrom: isFrom }) => {
  if (isFrom) {
    return (
      <tr className="edges-list-item">
        <td>This</td>
        <td>{edge.label}</td>
        <td className="td-link">
          <Link to={`/${node._id}`}>{node.label ? node.label : node._id}</Link>
        </td>
      </tr>
    );
  } else {
    return (
      <tr className="edges-list-item">
        <td className="td-link">
          <Link to={`/${node._id}`}>{node.label ? node.label : node._id}</Link>
        </td>
        <td>{edge.label}</td>
        <td>This</td>
      </tr>
    );
  }
};

const EdgeCard = ({ edges: edges, isFrom: isFrom }) => {
  let [edgeNodes, setEdgeNodes] = useState([]);
  let [edgeLinks, setEdgeLinks] = useState([]);

  useEffect(() => {
    Promise.all(
      edges.map(async (edge) => {
        let response = await fetch(
          `/arango_api/collection/${isFrom ? edge._to : edge._from}/`,
        );
        return response.json();
      }),
    ).then((promises) => setEdgeNodes(promises));
  }, [edges]);

  useEffect(() => {
    setEdgeLinks(
      edgeNodes.map((node, index) => (
        <EdgeLink edge={edges[index]} node={node} isFrom={isFrom} />
      )),
    );
  }, [edgeNodes]);

  return (
    <fieldset>
      <legend>{isFrom ? "Outbound edges" : "Inbound Edges"}</legend>
      <table className="edges-table">
        <tbody className="edge-list-item">{edgeLinks}</tbody>
      </table>
    </fieldset>
  );
};

export default EdgeCard;
