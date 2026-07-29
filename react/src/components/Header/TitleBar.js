import logo from "assets/nlm-ckn-logo.png";
import SearchBar from "components/SearchBar/SearchBar";
import { useLocation } from "react-router-dom";

/**
 * Navy title bar: brand (logo + wordmark) on the left, global search on the right.
 * The global search is hidden on the Home/search route ("/"), where the page's
 * own search box is the primary search.
 */
const TitleBar = () => {
  const { pathname } = useLocation();
  const showSearch = pathname !== "/";

  return (
    <div className="app-title-bar">
      <div className="app-title-brand">
        <img
          className="app-title-logo"
          src={logo}
          alt="NLM Cell Knowledge Network logo"
          width="56"
          height="56"
        />
        <span className="app-title-wordmark">NLM Cell Knowledge Network</span>
      </div>
      {showSearch && <SearchBar placeholder="Search gene, tissue, cell set, publication..." />}
    </div>
  );
};

export default TitleBar;
