import { Link } from "react-router-dom";

/**
 * Sidebar footer offering entry points to learn about the knowledge graph.
 * Static links; no data dependencies.
 */
const LearnExplore = () => (
  <div className="learn-explore">
    <div className="learn-explore-header">
      <span className="learn-explore-icon" aria-hidden="true">
        !
      </span>
      <span className="learn-explore-title">Learn &amp; Explore</span>
    </div>
    <Link className="learn-explore-link" to="/schema">
      <span>Knowledge Graph Schema</span>
      <span className="learn-explore-arrow" aria-hidden="true">
        →
      </span>
    </Link>
    <Link className="learn-explore-link" to="/about">
      <span>How to explore NLM-CKN</span>
      <span className="learn-explore-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  </div>
);

export default LearnExplore;
