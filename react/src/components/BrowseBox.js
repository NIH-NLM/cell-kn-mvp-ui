import {Link} from "react-router-dom";

const BrowseBox = () => {

    return (
            <div className="browse-box">
                    <Link to="/CL"><h3>CL</h3></Link>
                    <Link to="/GO"><h3>GO</h3></Link>
                    <Link to="/NCBITaxon"><h3>NCBITaxon</h3></Link>
                    <Link to="/PATO"><h3>PATO</h3></Link>
                    <Link to="/PR"><h3>PR</h3></Link>
                    <Link to="/UBERON"><h3>UBERON</h3></Link>
            </div>
        )
}

export default BrowseBox
