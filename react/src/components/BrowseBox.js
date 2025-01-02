import {Link} from "react-router-dom";

const BrowseBox = ({ currentCollection }) => {

    // List of collections to link to
    const collections = [
        "CHEBI", "CL", "GO", "NCBITaxon", "PATO", "PR", "UBERON",
        "anatomic_structure", "biomarker_combination", "cell_set", "disease",
        "drug_product", "gene_name", "publication"
    ];

    return (
        <div className="browse-box">
            <ul>
                {collections.map((coll) => (
                    <li key={coll}>
                        <Link
                            to={`/browse/${coll}`}
                            className={coll === currentCollection ? "active" : ""}
                        >
                            <h3>{coll}</h3>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BrowseBox;


