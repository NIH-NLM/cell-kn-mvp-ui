import React, { useState, useEffect } from 'react'
import CellCard from "../components/CellCard";
import ForceGraph from "../components/ForceGraph";

/* TODO: Rename */
const CellPage = ({ match, history }) => {

    let cellId = match.params.id
    let collection = match.params.coll
    let [cell, setCell] = useState(null)

    // Set state for outbound edges
    let [outboundEdges, setOutboundEdges] = useState([])

    // Set state for inbound edges
    let [inboundEdges, setInboundEdges] = useState([])

    /* TODO: Remove unneeded code - most of useEffect, and others */
    useEffect(() => {
        getCell().then(r => setCell(r))

        // Get outbound edges
        Promise.all([getEdges(`${collection}-CL`, collection, true),
        getEdges(`${collection}-GO`, collection, true),
        getEdges(`${collection}-NCBITaxon`, collection, true),
        getEdges(`${collection}-PATO`, collection, true),
        getEdges(`${collection}-PR`, collection, true),
        getEdges(`${collection}-UBERON`, collection, true)
            ]).then(promises => setOutboundEdges(promises.flat(1)))

        // Get inbound edges
        Promise.all([getEdges(`${collection}-CL`, collection, false),
            getEdges(`${collection}-GO`, collection, false),
            getEdges(`${collection}-NCBITaxon`, collection, false),
            getEdges(`${collection}-PATO`, collection, false),
            getEdges(`${collection}-PR`, collection, false),
            getEdges(`${collection}-UBERON`, collection, false)
        ]).then(promises => setInboundEdges(promises.flat(1)))
    }, [cellId, collection])

    let getCell = async () => {
        let response = await fetch(`/arango_api/collection/${collection}/${cellId}/`)
        return response.json()
    }

    let getEdges = async (edge_coll, node_coll, isFrom) => {
        let response = await fetch(`/arango_api/edges/${edge_coll}/${isFrom? "_from" : "_to"}/${node_coll}/${cellId}/`)
        return response.json()
    }

    //TODO: Move helper functions such as this to isolated helper function 'utils' */
    function capitalCase(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    if (cell){
        return (
            <div className="cell-card" >
                <div className="cell-item-header">
                    <h1>{capitalCase(cell.label? cell.label : cell._id)}</h1>
                    <span>{cell.term}</span>
                </div>
                <div className="cell-item-container">
                    <CellCard cell={cell} />
                    <ForceGraph nodeIds={[cell._id]} heightRatio={1} />
                </div>
            </div>
        )
    } else {
        // TODO: Handle error
        return <div>Error</div>
    }
}

export default CellPage
