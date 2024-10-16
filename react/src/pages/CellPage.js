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
        console.log(data)
        setEdgesFromThisToCL(data)
    }

    let getEdgesFromCLToThis = async () => {
        let response = await fetch(`/arango_api/edges/CL-CL/_to/CL/${cellId}/`)
        let data = await response.json()
        console.log(data)
        setEdgesFromCLToThis(data)
    }

    return (
        <div className="cell" >
            {cell?
                <CellCard cell={cell} /> : <div>Cell not found</div>
            }
            <div className="edges-from-this-to-other">
                {edgesFromThisToCL ?
                    <EdgeCard edges={edgesFromThisToCL} /> : <span></span> }
            </div>
            <div className="edges-to-this-from-other">
                {edgesFromCLToThis ?
                    <EdgeCard edges={edgesFromCLToThis} /> : <span></span> }
            </div>
        </div>
    )
}

export default CellPage
