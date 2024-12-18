import React from 'react'
import {Link} from "react-router-dom";

const Header = () => {

    return (
        <div>
            <div className="app-header background-color-main">
                <h1>NLM Knowledge Network</h1>
                <div>Login</div>
            </div>
            <div className="navbar background-color-light-bg">
                <Link to="/"><h4>Browse</h4></Link>
                <Link to="/aql"><h4>Query</h4></Link>
            </div>
        </div>
    )
}

export default Header
