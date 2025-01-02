import {
    HashRouter as Router,
    Route, Switch
} from "react-router-dom";


import './App.css';
import Header from './components/Header'
import CLList from "./pages/CLList";
import CellPage from "./pages/CellPage";
import SearchPage from "./pages/SearchPage";
import BrowsePage from "./pages/BrowsePage";
import AQLQueryPage from "./pages/AQLQueryPage";
import ExplorationPage from "./pages/ExplorationPage";
import {ActiveNavProvider} from "./components/ActiveNavContext";

function App() {
  return (
    <Router>
        <ActiveNavProvider>
            <div className="site-container background-color-white">
                <Header />
                <div className="app">
                    <Switch>
                        <Route path="/browse/:coll/:id" component={CellPage} />
                        <Route path="/browse/:coll" component={CLList} />
                        <Route path="/browse" component={BrowsePage} />
                        <Route path="/aql" component={AQLQueryPage} />
                        <Route path="/" component={ExplorationPage} />
                    </Switch>
                </div>
        </div>
      </ActiveNavProvider>
    </Router>
  );
}

export default App;
