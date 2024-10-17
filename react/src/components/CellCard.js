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
            <div className="cell-item-list" >
                <fieldset>
                    <legend>{getLabel(cell)}</legend>
                    <table>
                        {Object.entries(cell).map(([key, value]) =>
                            <tr>
                                <td className="nowrap">{key}</td>
                                <td>{value}</td>
                            </tr>
                        )}
                    </table>
                </fieldset>
            </div>
    )
}

export default CellCard
