import { useEffect, useState } from "react";
import ForceGraph from "../components/ForceGraph";

const AQLQueryPage = () => {
    const [queryTemplate, setQueryTemplate] = useState('');
    const [nodeIds, setNodeIds] = useState({});
    const [error, setError] = useState(null);
    const [predefinedQueries, setPredefinedQueries] = useState([]);
    const [selectedQueryId, setSelectedQueryId] = useState('');
    const [term, setTerm] = useState('');
    const [ncbiTerm, setNcbiTerm] = useState('');

    useEffect(() => {
        // Fetch predefined queries on component mount
        const fetchPredefinedQueries = async () => {
            //TODO: Don't fetch full queries
            try {
                const response = await fetch('/api/predefined-queries/');
                if (!response.ok) {
                    throw new Error('Failed to fetch predefined queries');
                }
                const data = await response.json();
                setPredefinedQueries(data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchPredefinedQueries();
    }, []);

    const handleQueryChange = (event) => {
        const selectedId = event.target.value;
        setSelectedQueryId(selectedId);
        const selectedQuery = predefinedQueries.find(q => q.id === parseInt(selectedId));
        setQueryTemplate(selectedQuery ? selectedQuery.query : '');
    };

    const executeQuery = async () => {
        setError(null); // Reset any previous error
        try {
            const response = await fetch(`/arango_api/aql/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: queryTemplate
                        .replace(/@term/g, `"${term}"`)
                        .replace(/@ncbiTerm/g, `"${ncbiTerm}"`)
                }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            //TODO: avoid hard-coding expected results?
            setNodeIds(data["nodes"].map(obj => obj._id));
        } catch (err) {
            setError(err.message);
            setNodeIds([]); // Clear previous results on error
        }
    };

    return (
        <div className="aql-query-container">
            <div className="aql-query-input">
                <select onChange={handleQueryChange} defaultValue="">
                    <option value="" disabled>Select a predefined query</option>
                    {predefinedQueries.map(query => (
                        <option key={query.id} value={query.id}>
                            {query.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Enter text in NCBITaxon label..."
                    value={ncbiTerm}
                    onChange={(e) => setNcbiTerm(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Enter text in UBERON label..."
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                />
                <button onClick={executeQuery}>Search for Cells</button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="graph-container">
                {Object.keys(nodeIds).length > 0 ? (
                    <ForceGraph nodeIds={nodeIds} defaultDepth={1} />
                ) : (
                    <div>{error}</div>
                )}
            </div>
        </div>
    );
};

export default AQLQueryPage;
