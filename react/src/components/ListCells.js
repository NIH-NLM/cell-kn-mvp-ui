import React from 'react'
import { Link } from 'react-router-dom'

let getLabel = (cell) => {

    let label = ""
    if (cell.label) {
        label = cell.label
    } else if (cell.term){
        label = cell.term
    } else{
        label = cell._id
    }
    return label
}


const ListCells = ({ cell: cell }) => {
    return (
        <Link to={cell._id}>
            <div className="list-cell" >
                <h3>{getLabel(cell)}</h3>
            </div>
        </Link>
    )
}

export default ListCells
