import React from 'react'
import { Link } from 'react-router-dom'

const EdgeLink = ({ edge: edge, from}) => {
    if(from) {
        return (
                <tr className="edges-list-item" >
                    <td>This</td>
                    <td>{edge.label}</td>
                    <td><Link to={`/${edge._to}`}>{edge._to}</Link>}</td>
                </tr>
        )
    } else {
        return (

                <tr className="edges-list-item" >
                    <td><Link to={`/${edge._from}`}>{edge._from}</Link></td>
                    <td>{edge.label}</td>
                    <td>This</td>
                </tr>
        )
    }
}

const EdgeCard = ({ edges: edges, from=true }) => {
    return (
                <tbody className="edge-list-table">
                    {edges.map((edge, index) => (
                        <EdgeLink key={index} edge={edge} from={from} />
                    ))}
                </tbody>
    )
}

export default EdgeCard
