import React, {useEffect, useState} from 'react'
import { Link } from 'react-router-dom'

const EdgeLink = ({edge: edge, node: node, isFrom : isFrom}) => {
    if (isFrom) {
        return (
            <tr className="edges-list-item">
                <td>This</td>
                <td>{edge.label}</td>
                <td><Link to={`/${node._id}`}>{node.label? node.label : node._id}</Link></td>
            </tr>
        )
    } else {
        return (
            <tr className="edges-list-item">
                <td><Link to={`/${node._id}`}>{node.label? node.label : node._id}</Link></td>
                <td>{edge.label}</td>
                <td>This</td>
            </tr>
        )
    }
}

const EdgeCard = ({ edges: edges, from: isFrom = true }) => {

    let [edgeNodes, setEdgeNodes] = useState([])
    let [edgeLinks, setEdgeLinks] = useState([])

    useEffect( () =>{
        Promise.all(edges.map((async edge => {
            let response = await fetch(`/arango_api/${isFrom? edge._to : edge._from}/`)
            return response.json()
        }))).then(promises => setEdgeNodes(promises))
    }, [edges])

    useEffect(() =>{
        setEdgeLinks(edgeNodes.map((node, index) => (
            <EdgeLink edge={edges[index]} node={node} from={isFrom} />
        )))
    }, [edgeNodes])

    return (
                <div className="edge-list-item">
                    {edgeLinks}
                </div>
    )
}

export default EdgeCard
