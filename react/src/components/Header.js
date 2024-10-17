import React from 'react'
import {Link} from "react-router-dom";

const Header = () => {

    return (
        <div className="app-header">
            <Link to="/ontology"><h1>CL</h1></Link>
            <h1>GO</h1>
            <h1>NCBITaxon</h1>
            <h1>PATO</h1>
            <h1>PR</h1>
            <h1>UBERON</h1>
        </div>
    )
}

export default Header
