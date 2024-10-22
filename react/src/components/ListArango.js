import React from 'react'
import { Link } from 'react-router-dom'

let getContent = (note) => {

    let content = ""
    try {
        content = note.content
    }
    catch {
        //TODO: log these correctly
        console.log("No content for note with id: " + note._id)
    }
    return content
}

let getDate = (note) => {
    let date = ""
    try {
        date = note.date
    }
    catch {
        //TODO: log these correctly
        console.log("No date for note with id: " + note._id)
    }
    return date
}


let getId = (note) => {
    return note._id
}


const ListArango = ({ note }) => {
    return (
        <Link to={`/note/${note._key}`}>
            <div className="notes-list-item" >
                <h3>{getId(note)}</h3>
                <p><span>{getDate(note)}</span>{getContent(note)}</p>
            </div>

        </Link>
    )
}

export default ListArango
