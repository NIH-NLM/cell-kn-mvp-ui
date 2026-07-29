import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

/**
 * A row of clickable example searches — each an entity-type icon plus the term —
 * to show the range of things the knowledge network can be searched for.
 *
 * @param {{ examples: {term: string, type: string, icon: object}[], onPick: (term: string) => void }} props
 */
const ExampleSearches = ({ examples, onPick }) => {
  if (!examples || examples.length === 0) return null;

  return (
    <ul className="example-searches-list">
      {examples.map(({ term, type, icon }) => (
        <li key={term}>
          <button
            type="button"
            className="example-search-chip"
            onClick={() => onPick(term)}
            title={`${term} — ${type}`}
          >
            {icon && (
              <FontAwesomeIcon icon={icon} className="example-search-icon" aria-hidden="true" />
            )}
            <span className="example-search-term">{term}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ExampleSearches;
