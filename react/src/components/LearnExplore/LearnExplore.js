import { Link } from "react-router-dom";

/**
 * Info tile marking the section header, exported from Figma (683:5658):
 * a 20x20 rounded square behind an exclamation glyph.
 */
const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    className="learn-explore-icon"
    aria-hidden="true"
  >
    {/* Fills come from CSS — `var()` does not resolve in SVG presentation attributes. */}
    <path
      className="learn-explore-icon-tile"
      d="M0 4C0 1.79086 1.79086 0 4 0H16C18.2091 0 20 1.79086 20 4V16C20 18.2091 18.2091 20 16 20H4C1.79086 20 0 18.2091 0 16V4Z"
    />
    <path
      className="learn-explore-icon-glyph"
      d="M9 11.7143V4H11V11.7143H9ZM9 16V14.2857H11V16H9Z"
    />
  </svg>
);

/**
 * Trailing arrow on each link row, exported from Figma (683:5665). Fill follows
 * `currentColor` so the row's hover state can tint it.
 */
const ArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 15.575 11.15"
    fill="currentColor"
    className="learn-explore-arrow"
    aria-hidden="true"
  >
    <path d="M9.3 10.85C9.1 10.65 9.004 10.4083 9.012 10.125C9.02067 9.84167 9.125 9.6 9.325 9.4L12.15 6.575H1C0.716667 6.575 0.479 6.479 0.287 6.287C0.0956668 6.09567 0 5.85833 0 5.575C0 5.29167 0.0956668 5.054 0.287 4.862C0.479 4.67067 0.716667 4.575 1 4.575H12.15L9.3 1.725C9.1 1.525 9 1.28733 9 1.012C9 0.737333 9.1 0.5 9.3 0.3C9.5 0.0999997 9.73767 0 10.013 0C10.2877 0 10.525 0.0999997 10.725 0.3L15.3 4.875C15.4 4.975 15.471 5.08333 15.513 5.2C15.5543 5.31667 15.575 5.44167 15.575 5.575C15.575 5.70833 15.5543 5.83333 15.513 5.95C15.471 6.06667 15.4 6.175 15.3 6.275L10.7 10.875C10.5167 11.0583 10.2877 11.15 10.013 11.15C9.73767 11.15 9.5 11.05 9.3 10.85Z" />
  </svg>
);

/**
 * Sidebar footer offering entry points to learn about the knowledge graph.
 * Static links; no data dependencies.
 */
const LearnExplore = () => (
  <div className="learn-explore">
    <div className="learn-explore-header">
      <InfoIcon />
      <span className="learn-explore-title">Learn &amp; Explore</span>
    </div>
    <Link className="learn-explore-link" to="/schema">
      <span>Knowledge Graph Schema</span>
      <ArrowIcon />
    </Link>
    <Link className="learn-explore-link" to="/about">
      <span>How to explore NLM-CKN</span>
      <ArrowIcon />
    </Link>
  </div>
);

export default LearnExplore;
