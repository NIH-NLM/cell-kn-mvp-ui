import React, { useContext, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useActiveNav } from "../ActiveNavContext/ActiveNavContext";
import { GraphContext } from "../Contexts/Contexts";

const Header = () => {
  const { graphType, setGraphType } = useContext(GraphContext);
  const { activeNav, setActive } = useActiveNav();
  const location = useLocation();

  const handleGraphToggle = () => {
    const newGraphValue = graphType === "phenotypes" ? "ontologies" : "phenotypes";
    setGraphType(newGraphValue);
  };

  // Update activeNav whenever location changes
  useEffect(() => {
    setActive(location.pathname);
  }, [location, setActive]);

  return (
    <div>
      <div className="app-header background-color-main">
        <h1>NLM Cell Knowledge Network</h1>
        <div>Login</div>
      </div>
      <div className="navbar background-color-light-bg">
        <Link to="/">
          <h4 className={activeNav === "/" ? "active-nav" : ""}>Explore</h4>
        </Link>
        <Link to="/browse">
          <h4 className={activeNav.startsWith("/browse") ? "active-nav" : ""}>
            Browse
          </h4>
        </Link>
        <Link to="/schema">
          <h4 className={activeNav.startsWith("/schema") ? "active-nav" : ""}>
            Schema
          </h4>
        </Link>
        <Link to="/aql">
          <h4 className={activeNav === "/aql" ? "active-nav" : ""}>Query</h4>
        </Link>
        <div className="graph-context-toggle-container">
          <div className="graph-context-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={graphType === "ontologies"}
                onChange={handleGraphToggle}
                aria-label="Toggle between Phenotypes and Ontologies"
              />
              <span className="slider round"></span>
            </label>
            <span className="label-toggle-item">Full</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
