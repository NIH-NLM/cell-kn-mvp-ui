import {HashRouter as Router, Route, Routes} from "react-router-dom";

/* TODO: get favicon in public working */
import "./App.css";
import Header from "./components/Header";
import DocumentList from "./pages/DocumentList";
import DocumentPage from "./pages/DocumentPage";
import BrowsePage from "./pages/BrowsePage";
import AQLQueryPage from "./pages/AQLQueryPage";
import ExplorationPage from "./pages/ExplorationPage";
import SchemaPage from "./pages/SchemaPage";
import { ActiveNavProvider } from "./components/ActiveNavContext";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <ActiveNavProvider>
        <div className="site-container background-color-white">
          <Header />
          <div className="app">
            <Routes>
              <Route path="/browse/:coll/:id" element={<DocumentPage />} />
              <Route path="/browse/:coll" element={<DocumentList/>} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/aql" element={<AQLQueryPage />} />
              <Route path="/schema" element={<SchemaPage />} />
              <Route path="/" element={<ExplorationPage />} />
            </Routes>
          </div>
          <Footer/>
        </div>
      </ActiveNavProvider>
    </Router>
  );
}

export default App;
