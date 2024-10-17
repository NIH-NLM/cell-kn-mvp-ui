import React, { useState, useEffect } from 'react'
import CellCard from "../components/CellCard";
import EdgeCard from "../components/EdgeCard";

const CellPage = ({ match, history }) => {

    let cellId = match.params.id
    let [cell, setCell] = useState(null)
    let [edgesFromThisToCL, setEdgesFromThisToCL] = useState(null)
    let [edgesFromCLToThis, setEdgesFromCLToThis] = useState(null)

    useEffect(() => {
        getCell()
        getEdgesFromThisToCL()
        getEdgesFromCLToThis()
    }, [cellId])

    let getCell = async () => {
        let response = await fetch(`/arango_api/CL/${cellId}/`)
        let data = await response.json()
        setCell(data)
    }

    let getEdgesFromThisToCL = async () => {
        let response = await fetch(`/arango_api/edges/CL-CL/_from/CL/${cellId}/`)
        let data = await response.json()
        setEdgesFromThisToCL(data)
    }

    let getEdgesFromCLToThis = async () => {
        let response = await fetch(`/arango_api/edges/CL-CL/_to/CL/${cellId}/`)
        let data = await response.json()
        setEdgesFromCLToThis(data)
    }

    return (
        <div className="cell-card" >
            {cell?
                <CellCard cell={cell} /> : <div>Cell not found</div>
            }
            <div className="link-tables">
                <fieldset>
                    <legend>From This to CL Details</legend>
                    <table className="edges-from-this-to-other edges-table">
                        <tbody>
                        {edgesFromThisToCL ?
                            <EdgeCard edges={edgesFromThisToCL} from={true} /> : <span></span> }
                        </tbody>
                    </table>
                </fieldset>
                <fieldset>
                    <legend>From CL to This Details</legend>
                    <table className="edges-to-this-from-other edges-table">
                        <tbody>
                        {edgesFromCLToThis ?
                            <EdgeCard edges={edgesFromCLToThis} from={false} /> : <span></span> }
                        </tbody>
                    </table>
                </fieldset>
            </div>
        </div>
    )
}

export default CellPage
