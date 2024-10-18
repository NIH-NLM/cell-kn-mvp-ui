import React, { useState, useEffect } from 'react'
import CellCard from "../components/CellCard";
import EdgeCard from "../components/EdgeCard";

const CellPage = ({ match, history }) => {

    let cellId = match.params.id
    let collection = match.params.coll
    let [cell, setCell] = useState(null)

    // Set state for outbound edges
    let [outboundEdges, setOutboundEdges] = useState([])

    // Set state for inbound edges
    let [inboundEdges, setInboundEdges] = useState([])

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
        let response = await fetch(`/arango_api/${collection}/${cellId}/`)
        return response.json()
    }

    let getEdges = async (edge_coll, node_coll, isFrom) => {
        let response = await fetch(`/arango_api/edges/${edge_coll}/${isFrom? "_from" : "_to"}/${node_coll}/${cellId}/`)
        return response.json()
    }

    return (
        <div className="cell-card" >
            {cell?
                <CellCard cell={cell} /> : <div>Cell not found</div>
            }
            <div className="link-tables">
                <fieldset>
                    <legend>Outbound edges</legend>
                    <table className="edges-table">
                        <tbody>
                            <EdgeCard edges={outboundEdges} isFrom={true} />
                        </tbody>
                    </table>
                </fieldset>
                <fieldset>
                    <legend>Inbound edges</legend>
                    <table className="edges-table">
                        <tbody>
                            <EdgeCard edges={inboundEdges} isFrom={false} />
                        </tbody>
                    </table>
                </fieldset>
            </div>
        </div>
    )
}

export default CellPage
