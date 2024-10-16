import React from 'react'
import { Link } from 'react-router-dom'

let getLabel = (cell) => {

    let label = ""
    try {
        label = cell.label
    }
    catch {
        //TODO: log these correctly
        console.log("No content for cell with id: " + cell._id)
    }
    return label
}

let getTerm = (cell) => {
    let term = ""
    try {
        term = cell.term
    }
    catch {
        //TODO: log these correctly
        console.log("No date for cell with id: " + cell._id)
    }
    return term
}


let getId = (cell) => {
    return cell._id
}


const CellCard = ({ cell: cell }) => {
    return (
            <div className="cells-list-item" >
                <h3>{getLabel(cell)}</h3>
                <div>
                    {Object.entries(cell).map(([key, value]) =>
                        <p>{key} : {value}</p>
                    )}
                </div>
            </div>
    )
}

export default CellCard
