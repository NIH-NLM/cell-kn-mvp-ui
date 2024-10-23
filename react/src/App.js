import {
    HashRouter as Router,
    Route, Switch
} from "react-router-dom";


import './App.css';
import Header from './components/Header'
import CLList from "./pages/CLList";
import CellPage from "./pages/CellPage";
import SearchPage from "./pages/SearchPage";

function App() {
  return (
    <Router>
      <Header />
      <div className="container">
        <div className="app">
            <Switch>
                <Route path="/:coll/:id" component={CellPage} />
                <Route path="/:coll" component={CLList} />
                <Route path="/" component={SearchPage} />
            </Switch>
        </div>
      </div>
    </Router>
  );
}

export default App;
