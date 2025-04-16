import { HashRouter as Router, Route, Routes } from "react-router-dom";

/* TODO: get favicon in public working */
import "./App.css";
import Header from "./components/Header/Header";
import DocumentListPage from "./pages/DocumentListPage/DocumentListPage";
import DocumentPage from "./pages/DocumentPage/DocumentPage";
import BrowsePage from "./pages/BrowsePage/BrowsePage";
import AQLQueryPage from "./pages/AQLQueryPage/AQLQueryPage";
import ExplorationPage from "./pages/ExplorationPage/ExplorationPage";
import SchemaPage from "./pages/SchemaPage/SchemaPage";
import { ActiveNavProvider } from "./components/ActiveNavContext/ActiveNavContext";
import Footer from "./components/Footer/Footer";
import { GraphProvider } from "./components/Contexts/Contexts";

function App() {
  return (
    <Router>
      <ActiveNavProvider>
        <GraphProvider>
          <div className="site-container background-color-white">
            <Header />
            <div className="app">
              <Routes>
                <Route path="/browse/:coll/:id" element={<DocumentPage />} />
                <Route path="/browse/:coll" element={<DocumentListPage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/aql" element={<AQLQueryPage />} />
                <Route path="/schema" element={<SchemaPage />} />
                <Route path="/" element={<ExplorationPage />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </GraphProvider>
      </ActiveNavProvider>
    </Router>
  );
}

export default App;
