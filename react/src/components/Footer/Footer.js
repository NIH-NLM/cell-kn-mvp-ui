const Footer = () => {
  return (
    <div className="footer">
        <p>
            The National Library of Medicine (NLM) Cell Knowledge Network is a knowledgebase about cell characteristics
            (phenotypes) emerging from single cell technologies, integrated with other sources of trusted knowledge,
            sourced from:
        </p>
        <ul>
            <li>
                Validated data processing and analysis pipelines
            </li>
            <li>
              Reference ontologies
            </li>
            <li>
              NCBI and other information resources
            </li>
            <li>
              LLM-based text mining
            </li>
        </ul>
        <p>
            A knowledge graph is produced from triple assertions (subject-predicate-object) corresponding to biomedical
            entities (nodes) and their relations (edges), and links experimental data to the reference Cell Ontology as
            evidence in support of assertions. The graph integrates single cell genomics experimental data with other
            information sources about cells, tissues, biomarkers, pathways, drugs, diseases.
        </p>
    </div>
  );
};

export default Footer;
