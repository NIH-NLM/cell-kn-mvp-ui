import React, { useState, useEffect } from 'react'
import ListCells from "../components/ListCells";


const CLList = ({ match, history }) => {

    let collection = match.params.coll
    let [clList, setClList] = useState([])

    useEffect(() => {
        getClList()
    }, [collection])


    let getClList = async () => {

        let response = await fetch(`/arango_api/${collection}/`)
        let data = await response.json()
        sortClList(data)
    }

    let sortClList = (clList) => {
        let sortedList = Object.values(clList)
        sortedList.sort(function(a, b) {
            return parseInt(a._key) - parseInt(b._key);  //TODO: Handle non-int keys?
        })
        setClList(sortedList)
    }

    return (
        <div className="cl">
            <div className="cl-header">
                <p className="cl-count">{clList.length} results</p>
            </div>
            <div className="cl-list">
                {clList.map((cell, index) => (
                    <ListCells key={index} cell={cell} />
                ))}
            </div>
        </div>
    )
}

export default CLList
