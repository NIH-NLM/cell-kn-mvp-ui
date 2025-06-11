import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-content-wrapper">
        <div className="footer-section footer-links">
          <a
            href="https://github.com/NIH-NLM/cell-kn-mvp"
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

        <div className="footer-section footer-copyright">
          <p>© {currentYear} National Library of Medicine (NLM).</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
