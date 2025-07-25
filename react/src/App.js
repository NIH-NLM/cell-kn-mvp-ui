import { HashRouter as Router, Route, Routes } from "react-router-dom";

import "./App.css";
import Header from "./components/Header/Header";
import DocumentPage from "./pages/DocumentPage/DocumentPage";
import CollectionsPage from "./pages/CollectionsPage/CollectionsPage";
import AQLQueryPage from "./pages/AQLQueryPage/AQLQueryPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import { ActiveNavProvider } from "./components/ActiveNavContext/ActiveNavContext";
import Footer from "./components/Footer/Footer";
import { GraphProvider } from "./contexts/GraphContext";
import SunburstPage from "./pages/SunburstPage/SunburstPage";
import TreePage from "./pages/TreePage/TreePage";
import AboutPage from "./pages/AboutPage/AboutPage";
import FTUExplorerPage from "./pages/FTUExplorerPage/FTUExplorerPage";
import { FtuPartsProvider } from "./contexts/FTUPartsContext";

function App() {
  return (
    <Router>
      <ActiveNavProvider>
        <GraphProvider>
          <FtuPartsProvider>
            <div className="site-container background-color-white">
              <Header />
              <div className="app">
                <Routes>
                  <Route
                    path="/collections/:coll/:id"
                    element={<DocumentPage />}
                  />
                  <Route
                    path="/collections/:coll"
                    element={<CollectionsPage />}
                  />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/ftu" element={<FTUExplorerPage />} />
                  <Route path="/aql" element={<AQLQueryPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/tree" element={<TreePage />} />
                  <Route path="/sunburst" element={<SunburstPage />} />
                  <Route path="/" element={<SearchPage />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </FtuPartsProvider>
        </GraphProvider>
      </ActiveNavProvider>
    </Router>
  );
}

export default App;
