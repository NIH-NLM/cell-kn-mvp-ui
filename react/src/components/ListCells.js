import React from 'react'
import { Link } from 'react-router-dom'

let getLabel = (cell) => {

    let label = ""
    try {
        label = cell.label
    }
    catch {
        label = cell._id
    }
    return label
}


const ListCells = ({ cell: cell }) => {
    return (
        <Link to={`${cell._id}`}>
            <div className="cells-list-item" >
                <h3>{getLabel(cell)}</h3>
            </div>
        </Link>
    )
}

export default ListCells
