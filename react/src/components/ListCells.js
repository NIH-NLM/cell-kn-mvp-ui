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


const ListCells = ({ cell: cell }) => {
    return (
        <Link to={`/cell/${cell._key}`}>
            <div className="cells-list-item" >
                <h3>{getTerm(cell)}</h3>
                <p>{getLabel(cell)}</p>
            </div>

        </Link>
    )
}

export default ListCells
