import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useActiveNav } from "./ActiveNavContext";

const Header = () => {
  const { activeNav, setActive } = useActiveNav();
  const location = useLocation();

  // Update activeNav whenever location changes
  useEffect(() => {
    setActive(location.pathname);
  }, [location, setActive]);

  return (
    <div>
      <div className="app-header background-color-main">
        <h1>NLM Knowledge Network</h1>
        <div>Login</div>
      </div>
      <div className="navbar background-color-light-bg">
        <Link to="/">
          <h4 className={activeNav === "/" ? "active-nav" : ""}>Explore</h4>
        </Link>
        <Link to="/aql">
          <h4 className={activeNav === "/aql" ? "active-nav" : ""}>Query</h4>
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
      </div>
    </div>
  );
};

export default Header;
