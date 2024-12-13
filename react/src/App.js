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

function App() {
  return (
    <Router>
        <div className="site-container">
            <Header />
            <div className="app">
                <Switch>
                    <Route path="/browse" component={BrowsePage} />
                    <Route path="/aql" component={AQLQueryPage} />
                    <Route path="/:coll/:id" component={CellPage} />
                    <Route path="/:coll" component={CLList} />
                    <Route path="/" component={ExplorationPage} />
                </Switch>
            </div>
        </div>
    </Router>
  );
}

export default App;
