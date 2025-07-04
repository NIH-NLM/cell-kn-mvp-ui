import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useActiveNav } from "../ActiveNavContext/ActiveNavContext";

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
        <h1>NLM Cell Knowledge Network MVP</h1>
        {/*<div>Login</div>*/}
      </div>
      <div className="navbar background-color-light-bg">
        <Link to="/">
          <h4 className={activeNav === "/" ? "active-nav" : ""}>Search</h4>
        </Link>
        <Link to="/sunburst">
          <h4 className={activeNav === "/sunburst" ? "active-nav" : ""}>
            Browse
          </h4>
        </Link>
        <Link to="/tree">
          <h4 className={activeNav === "/tree" ? "active-nav" : ""}>Explore</h4>
        </Link>
        <Link to="/collections">
          <h4
            className={activeNav.startsWith("/collections") ? "active-nav" : ""}
          >
            Collections
          </h4>
        </Link>
        <Link to="/about">
          <h4 className={activeNav.startsWith("/about") ? "active-nav" : ""}>
            About
          </h4>
        </Link>
        {/* Hide query page until it is useful */}
        <Link to="/aql" style={{ display: "none" }}>
          <h4 className={activeNav === "/aql" ? "active-nav" : ""}>Query</h4>
        </Link>
      </div>
    </div>
  );
};

export default Header;
