import React from 'react'
import {Link} from "react-router-dom";

const Header = () => {

    return (
        <div className="app-header">
            <Link to="/"><h3>Search</h3></Link>
            <Link to="/aql"><h3>Query</h3></Link>
        </div>
    )
}

export default Header
