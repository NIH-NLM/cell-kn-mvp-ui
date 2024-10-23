import React from 'react'
import { Link } from 'react-router-dom'

const CellCard = ({ cell: cell }) => {
    return (
            <div className="cell-item-list" >
                <fieldset>
                    <legend>{cell.label}</legend>
                    <table>
                        {Object.entries(cell).map(([key, value]) => {
                                if (!key.startsWith("_")) {
                                    return (
                                        <tr>
                                            <td className="nowrap">{key}</td>
                                            <td>{value}</td>
                                        </tr>
                                    )
                                } else {
                                    return null
                                }
                            }
                        )}
                    </table>
                </fieldset>
            </div>
    )
}

export default CellCard
