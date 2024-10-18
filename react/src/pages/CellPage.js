import React, { useState, useEffect } from 'react'
import CellCard from "../components/CellCard";
import EdgeCard from "../components/EdgeCard";

const CellPage = ({ match, history }) => {

    let cellId = match.params.id
    let [cell, setCell] = useState(null)

    // Set state for outbound edges
    let [outboundEdges, setOutboundEdges] = useState([])

    // Set state for inbound edges
    let [inboundEdges, setInboundEdges] = useState([])

    useEffect(() => {
        getCell().then(r => setCell(r))

        // Get outbound edges
        Promise.all([getEdges("CL-CL", "CL", true),
        getEdges("CL-GO", "CL", true),
        getEdges("CL-NCBITaxon", "CL", true),
        getEdges("CL-PATO", "CL", true),
        getEdges("CL-PR", "CL", true),
        getEdges("CL-UBERON", "CL", true)
            ]).then(promises => setOutboundEdges(promises.flat(1)))

        // Get inbound edges
        Promise.all([getEdges("CL-CL", "CL", false),
            getEdges("CL-GO", "CL", false),
            getEdges("CL-NCBITaxon", "CL", false),
            getEdges("CL-PATO", "CL", false),
            getEdges("CL-PR", "CL", false),
            getEdges("CL-UBERON", "CL", false)
        ]).then(promises => setInboundEdges(promises.flat(1)))
    }, [cellId])

    let getCell = async () => {
        let response = await fetch(`/arango_api/CL/${cellId}/`)
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
                            <EdgeCard edges={outboundEdges} from={true} />
                        </tbody>
                    </table>
                </fieldset>
                <fieldset>
                    <legend>Inbound edges</legend>
                    <table className="edges-table">
                        <tbody>
                            <EdgeCard edges={inboundEdges} from={false} />
                        </tbody>
                    </table>
                </fieldset>
            </div>
        </div>
    )
}

export default CellPage
