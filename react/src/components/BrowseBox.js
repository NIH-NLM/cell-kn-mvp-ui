import {Link} from "react-router-dom";

const BrowseBox = () => {

    return (
            <div className="browse-box">
                <Link to="/CHEBI"><h3>CHEBI</h3></Link>
                <Link to="/CL"><h3>CL</h3></Link>
                <Link to="/GO"><h3>GO</h3></Link>
                <Link to="/NCBITaxon"><h3>NCBITaxon</h3></Link>
                <Link to="/PATO"><h3>PATO</h3></Link>
                <Link to="/PR"><h3>PR</h3></Link>
                <Link to="/UBERON"><h3>UBERON</h3></Link>
                <Link to="/anatomic_structure"><h3>anatomic_structure</h3></Link>
                <Link to="/biomarker_combination"><h3>biomarker_combination</h3></Link>
                <Link to="/cell_set"><h3>cell_set</h3></Link>
                <Link to="/disease"><h3>disease</h3></Link>
                <Link to="/drug_product"><h3>drug_product</h3></Link>
                <Link to="/gene_name"><h3>gene_name</h3></Link>
                <Link to="/publication"><h3>publication</h3></Link>
            </div>
        )
}

export default BrowseBox
