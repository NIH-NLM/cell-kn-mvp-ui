import React from 'react'
import {Link} from "react-router-dom";

const Header = () => {

    return (
        <div className="app-header">
            <Link to="/CL"><h1>CL</h1></Link>
            <Link to="/GO"><h1>GO</h1></Link>
            <Link to="/NCBITaxon"><h1>NCBITaxon</h1></Link>
            <Link to="/PATO"><h1>PATO</h1></Link>
            <Link to="/PR"><h1>PR</h1></Link>
            <Link to="/UBERON"><h1>UBERON</h1></Link>
        </div>
    )
}

export default Header
