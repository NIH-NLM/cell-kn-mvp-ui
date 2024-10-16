import React from 'react'
import { Link } from 'react-router-dom'

const EdgeLink = ({ edge: edge }) => {
    return (
        <Link to={`/${edge._id}`}>
            <div className="edges-list-item" >
                <h3>{edge.label}</h3>
            </div>
        </Link>
    )
}

const EdgeCard = ({ edges: edges }) => {
    return (
            <div className="cells-list-item" >
                <div className="edge-list">
                    {edges.map((edge, index) => (
                        <EdgeLink key={index} edge={edge} />
                    ))}
                </div>
            </div>
    )
}

export default EdgeCard
