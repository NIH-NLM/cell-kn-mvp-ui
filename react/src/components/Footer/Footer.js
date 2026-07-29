import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { fetchVersionInfo } from "services";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [versions, setVersions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchVersionInfo().then((data) => {
      if (!cancelled) setVersions(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The pin (ETL_VERSION in the repo) is what this checkout intends to run; the
  // loaded version is what the database actually holds. They agree in normal
  // operation, so show the pin only when it would tell the user something.
  //
  // pinned_etl_version is only absent when the response comes from a backend
  // that predates this feature (frontend and backend deploy independently, so
  // a new bundle can briefly run against an old backend). Its etl_version is
  // the pin itself, not a loaded version, so it cannot be substantiated —
  // don't render the ETL half at all rather than assert it.
  const etlVersion = versions?.etl_version;
  const pinnedEtlVersion = versions?.pinned_etl_version;
  const etlLabel =
    pinnedEtlVersion && etlVersion
      ? etlVersion !== pinnedEtlVersion
        ? `ETL ${etlVersion} (pinned ${pinnedEtlVersion})`
        : `ETL ${etlVersion}`
      : undefined;

  return (
    <footer className="site-footer">
      <div className="footer-content-wrapper">
        <div className="footer-section footer-links">
          <a
            href="https://github.com/NIH-NLM/nlm-ckn"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link github-link"
            aria-label="View source code on GitHub"
          >
            <FontAwesomeIcon icon={faGithub} />
            <span>View on GitHub</span>
          </a>
          <a
            href="https://www.nlm.nih.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            NLM
          </a>
          <a
            href="https://www.ncbi.nlm.nih.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            NCBI
          </a>
        </div>

        {versions && (versions.ui_version || etlLabel) && (
          <div className="footer-section footer-versions">
            {versions.ui_version && <span>UI {versions.ui_version}</span>}
            {versions.ui_version && etlLabel && <span> · </span>}
            {etlLabel && <span>{etlLabel}</span>}
          </div>
        )}

        <div className="footer-section footer-copyright">
          <p>© {currentYear} National Library of Medicine (NLM).</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
